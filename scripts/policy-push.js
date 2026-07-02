#!/usr/bin/env node
/**
 * Policy Push Script
 * policies/*.md を読み込み、policy_versions テーブルへ upsert する
 * 使い方: npm run db:policy
 */

const { Client } = require('pg')
const fs   = require('fs')
const path = require('path')

// .env.local を読み込む（db-push.js と同じ方式）
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local が見つかりません')
    process.exit(1)
  }
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
}

// フロントマターをパースする
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/s)
  if (!match) {
    console.error('❌ フロントマターが見つかりません。--- で囲まれたYAMLが必要です')
    return null
  }
  const meta = {}
  for (const line of match[1].split('\n')) {
    const eq = line.indexOf(':')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    const val = line.slice(eq + 1).trim()
    meta[key] = val
  }
  return { meta, body: match[2].trim() }
}

// ファイル名 → policy_type のマッピング
const FILE_TO_TYPE = {
  'terms':       'terms',
  'data-policy': 'data_policy',
  'privacy':     'privacy',
  'security':    'security',
}

async function main() {
  loadEnv()

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('❌ DATABASE_URL が設定されていません')
    process.exit(1)
  }

  const policiesDir = path.join(__dirname, '..', 'policies')
  if (!fs.existsSync(policiesDir)) {
    console.error('❌ policies/ ディレクトリが見つかりません')
    process.exit(1)
  }

  const files = fs.readdirSync(policiesDir).filter(f => f.endsWith('.md'))
  if (files.length === 0) {
    console.log('ℹ️  policies/ に .md ファイルがありません')
    return
  }

  const isRemote = dbUrl.includes('supabase') || dbUrl.includes('railway') || dbUrl.includes('rlwy')
  const client = new Client({
    connectionString: dbUrl,
    ssl: isRemote ? { rejectUnauthorized: false } : false,
  })

  await client.connect()
  console.log('✅ DB に接続しました')

  let ok = 0, skip = 0

  for (const file of files) {
    const base = file.replace(/\.md$/, '')
    const policyType = FILE_TO_TYPE[base]
    if (!policyType) {
      console.warn(`⚠️  ${file}: ファイル名が不明です。スキップします (terms / data-policy / privacy / security)`)
      skip++
      continue
    }

    const raw = fs.readFileSync(path.join(policiesDir, file), 'utf-8')
    const parsed = parseFrontmatter(raw)
    if (!parsed) { skip++; continue }

    const { meta, body } = parsed
    const { version, title, effective_date, summary, published } = meta

    if (!version || !title || !effective_date) {
      console.error(`❌ ${file}: version / title / effective_date が必須です`)
      skip++; continue
    }

    if (!body.trim()) {
      console.warn(`⚠️  ${file}: 本文が空です。スキップします`)
      skip++; continue
    }

    await client.query(
      `INSERT INTO policy_versions
         (policy_type, version, title, content, effective_date, summary, published)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (policy_type, version)
       DO UPDATE SET
         title          = EXCLUDED.title,
         content        = EXCLUDED.content,
         effective_date = EXCLUDED.effective_date,
         summary        = EXCLUDED.summary,
         published      = EXCLUDED.published,
         updated_at     = NOW()`,
      [
        policyType,
        version,
        title,
        body,
        effective_date,
        summary ?? null,
        published === 'false' ? false : true,
      ]
    )
    console.log(`✅ ${file} → ${policyType} v${version} を upsert しました`)
    ok++
  }

  await client.end()
  console.log(`\n完了: ${ok} 件 upsert / ${skip} 件 スキップ`)
}

main().catch(e => {
  console.error('❌ エラー:', e.message)
  process.exit(1)
})
