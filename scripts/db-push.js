#!/usr/bin/env node
/**
 * DB Schema Push Script
 * psql の代わりに Node.js から直接スキーマを適用する
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

// .env.local を読み込む
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  const examplePath = path.join(__dirname, '..', '.env.example')
  const filePath = fs.existsSync(envPath) ? envPath : examplePath

  if (!fs.existsSync(filePath)) {
    console.error('❌ .env.local が見つかりません。.env.example をコピーして作成してください。')
    process.exit(1)
  }

  const lines = fs.readFileSync(filePath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
}

async function main() {
  loadEnv()

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('❌ DATABASE_URL が設定されていません')
    process.exit(1)
  }

  const target = process.argv[2] || 'schema'
  const sqlFile = path.join(__dirname, '..', 'sql', `${target}.sql`)

  if (!fs.existsSync(sqlFile)) {
    console.error(`❌ ファイルが見つかりません: ${sqlFile}`)
    process.exit(1)
  }

  const sql = fs.readFileSync(sqlFile, 'utf8')

  console.log(`📦 接続中: ${dbUrl.replace(/:\/\/[^@]+@/, '://***@')}`)
  console.log(`📄 適用: sql/${target}.sql`)

  const client = new Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes('railway.internal') ? false : { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    console.log('✅ 接続成功')

    // Split statements by semicolon (simple approach)
    // Handle DO $$ blocks and CREATE FUNCTION blocks carefully
    await client.query(sql)
    console.log(`✅ ${target}.sql を適用しました`)
  } catch (err) {
    console.error('❌ エラー:', err.message)
    if (err.detail) console.error('   Detail:', err.detail)
    if (err.hint)   console.error('   Hint:', err.hint)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
