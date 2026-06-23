import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { getAuthContext, unauthorizedResponse } from '@/lib/server-auth'
import { serverError } from '@/lib/api-error'
import type { CreateMatchInput } from '@/types'

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 50

export async function GET(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  try {
    const { searchParams } = new URL(req.url)
    const map       = searchParams.get('map')
    const matchType = searchParams.get('match_type')
    const limit     = Math.min(Number(searchParams.get('limit') ?? DEFAULT_LIMIT), MAX_LIMIT)
    const page      = Math.max(1, Number(searchParams.get('page') ?? 1))
    const offset    = (page - 1) * limit

    const conditions = ['m.team_id = $1']
    const params: unknown[] = [auth.teamId]

    if (map)       { params.push(map);       conditions.push(`m.map = $${params.length}`) }
    if (matchType) { params.push(matchType); conditions.push(`m.match_type = $${params.length}`) }

    const whereClause = conditions.join(' AND ')

    const [matches, totalRow] = await Promise.all([
      query(
        `SELECT m.*,
                COUNT(r.id)  AS round_count,
                COUNT(ps.id) AS player_stat_count
         FROM matches m
         LEFT JOIN rounds r      ON r.match_id  = m.id
         LEFT JOIN player_stats ps ON ps.match_id = m.id
         WHERE ${whereClause}
         GROUP BY m.id
         ORDER BY m.match_date DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) AS count FROM matches m WHERE ${whereClause}`,
        params
      ),
    ])

    const total = Number(totalRow?.count ?? 0)

    return NextResponse.json({
      data: matches,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (err) {
    return serverError('matches GET', err)
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  try {
    const body: CreateMatchInput = await req.json()
    const {
      opponent_name, match_date, map,
      match_type = 'scrim',
      team_score, opponent_score,
      attack_rounds_won = 0, attack_rounds_played = 0,
      defense_rounds_won = 0, defense_rounds_played = 0,
      video_url, notes,
    } = body

    if (!opponent_name || !map || team_score == null || opponent_score == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const ts = Number(team_score)
    const os = Number(opponent_score)
    if (ts + os === 0) {
      return NextResponse.json({ error: 'スコアを入力してください（0-0 は無効です）' }, { status: 400 })
    }
    if (ts < 0 || os < 0 || ts > 25 || os > 25) {
      return NextResponse.json({ error: 'スコアは 0〜25 の範囲で入力してください' }, { status: 400 })
    }

    const match = await queryOne(
      `INSERT INTO matches
         (team_id, opponent_name, match_date, map, match_type, team_score, opponent_score,
          attack_rounds_won, attack_rounds_played, defense_rounds_won, defense_rounds_played,
          video_url, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        auth.teamId, opponent_name, match_date, map, match_type,
        ts, os,
        attack_rounds_won, attack_rounds_played,
        defense_rounds_won, defense_rounds_played,
        video_url ?? null, notes ?? null,
      ]
    )

    return NextResponse.json({ data: match }, { status: 201 })
  } catch (err) {
    return serverError('matches POST', err)
  }
}
