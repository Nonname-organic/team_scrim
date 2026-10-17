import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne, withTransaction } from '@/lib/db'
import { getAuthContext, unauthorizedResponse } from '@/lib/server-auth'
import { serverError, notFoundError } from '@/lib/api-error'
import { PRESET_LOSS_TAGS, type LossTag } from '@/lib/round-detail'

const COLS = 'id, name, preset_key, sort_order, active'

async function listTags(teamId: string) {
  return query<LossTag>(`SELECT ${COLS} FROM loss_tags WHERE team_id = $1 ORDER BY sort_order, created_at`, [teamId])
}

const cleanName = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 40) : '')

// 無効化したタグも返す（過去ラウンドの表示に必要）。初回取得時に初期タグを投入
export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()
  try {
    let tags = await listTags(auth.teamId)
    if (tags.length === 0) {
      await withTransaction(async client => {
        for (const [i, p] of PRESET_LOSS_TAGS.entries()) {
          await client.query(
            `INSERT INTO loss_tags (team_id, name, preset_key, sort_order) VALUES ($1, $2, $3, $4)
             ON CONFLICT (team_id, name) DO NOTHING`,
            [auth.teamId, p.name, p.key, i]
          )
        }
      })
      tags = await listTags(auth.teamId)
    }
    return NextResponse.json({ data: tags })
  } catch (err) {
    return serverError('loss-tags GET', err)
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()
  try {
    const name = cleanName((await req.json()).name)
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
    const tag = await queryOne<LossTag>(
      `INSERT INTO loss_tags (team_id, name, sort_order)
       VALUES ($1, $2, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM loss_tags WHERE team_id = $1))
       ON CONFLICT (team_id, name) DO UPDATE SET active = TRUE
       RETURNING ${COLS}`,
      [auth.teamId, name]
    )
    return NextResponse.json({ data: tag })
  } catch (err) {
    return serverError('loss-tags POST', err)
  }
}

// { order: [id...] } で並べ替え、{ id, name?, active? } で名前変更・有効/無効切替
export async function PATCH(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()
  try {
    const body = await req.json()

    if (Array.isArray(body.order)) {
      await withTransaction(async client => {
        for (const [i, id] of (body.order as unknown[]).entries()) {
          await client.query('UPDATE loss_tags SET sort_order = $1 WHERE id = $2 AND team_id = $3', [i, id, auth.teamId])
        }
      })
      return NextResponse.json({ data: await listTags(auth.teamId) })
    }

    const sets: string[] = []
    const vals: unknown[] = []
    if ('name' in body) {
      const name = cleanName(body.name)
      if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
      vals.push(name)
      // 名前を変えた初期タグはカスタム扱い（翻訳表示をやめる）
      sets.push(`name = $${vals.length}`, 'preset_key = NULL')
    }
    if ('active' in body) { vals.push(Boolean(body.active)); sets.push(`active = $${vals.length}`) }
    if (sets.length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

    vals.push(body.id, auth.teamId)
    const tag = await queryOne<LossTag>(
      `UPDATE loss_tags SET ${sets.join(', ')} WHERE id = $${vals.length - 1} AND team_id = $${vals.length} RETURNING ${COLS}`,
      vals
    )
    if (!tag) return notFoundError('タグが見つかりません')
    return NextResponse.json({ data: tag })
  } catch (err) {
    return serverError('loss-tags PATCH', err)
  }
}
