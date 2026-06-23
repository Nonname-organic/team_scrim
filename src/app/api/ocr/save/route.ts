import { NextRequest, NextResponse } from 'next/server'
import { withTransaction } from '@/lib/db'
import { getAuthContext, unauthorizedResponse } from '@/lib/server-auth'

interface PlayerEntry {
  player_id: string | null
  ign: string
  agent: string
  kills: number
  deaths: number
  assists: number
  acs: number
  adr: number
  hs_pct: number
  first_bloods: number
  first_deaths: number
  rounds_played: number
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  try {
    const body = await req.json()
    const {
      opponent_name, match_date, map, match_type,
      team_score, opponent_score,
      attack_rounds_won = 0, attack_rounds_played = 0,
      defense_rounds_won = 0, defense_rounds_played = 0,
      scoreboard_image_url,
      players,
    } = body

    if (!opponent_name || !map) {
      return NextResponse.json({ error: '対戦相手とマップは必須です' }, { status: 400 })
    }
    if (team_score == null || opponent_score == null || isNaN(Number(team_score)) || isNaN(Number(opponent_score))) {
      return NextResponse.json({ error: 'スコアを入力してください' }, { status: 400 })
    }
    const ts = Number(team_score)
    const os = Number(opponent_score)
    if (ts + os === 0) {
      return NextResponse.json({ error: 'スコアを入力してください（0-0 は無効です）' }, { status: 400 })
    }
    if (!players?.length) {
      return NextResponse.json({ error: '選手スタッツを入力してください' }, { status: 400 })
    }

    const result = await withTransaction(async (client) => {
      const matchRes = await client.query(
        `INSERT INTO matches
           (team_id, opponent_name, match_date, map, match_type,
            team_score, opponent_score,
            attack_rounds_won, attack_rounds_played,
            defense_rounds_won, defense_rounds_played,
            scoreboard_image_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
          auth.teamId, opponent_name, match_date, map, match_type,
          team_score, opponent_score,
          attack_rounds_won, attack_rounds_played,
          defense_rounds_won, defense_rounds_played,
          scoreboard_image_url ?? null,
        ]
      )
      const match = matchRes.rows[0]
      const matchId = match.id
      const savedStats = []
      const totalRounds = team_score + opponent_score

      for (const p of players as PlayerEntry[]) {
        if (!p.player_id) continue

        const rounds = p.rounds_played || totalRounds
        const kpr  = rounds > 0 ? p.kills   / rounds : 0
        const dpr  = rounds > 0 ? p.deaths  / rounds : 0
        const apr  = rounds > 0 ? p.assists / rounds : 0
        const fbsr = (p.first_bloods + p.first_deaths) > 0
          ? p.first_bloods / (p.first_bloods + p.first_deaths) : 0

        const statRes = await client.query(
          `INSERT INTO player_stats
             (match_id, player_id, agent, kills, deaths, assists, acs,
              kpr, dpr, apr, first_bloods, first_deaths, fbsr,
              adr, hs_pct, rounds_played)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           ON CONFLICT (match_id, player_id) DO UPDATE SET
             agent=$3, kills=$4, deaths=$5, assists=$6, acs=$7,
             kpr=$8, dpr=$9, apr=$10, first_bloods=$11, first_deaths=$12,
             fbsr=$13, adr=$14, hs_pct=$15, rounds_played=$16
           RETURNING *`,
          [
            matchId, p.player_id, p.agent || 'unknown',
            p.kills, p.deaths, p.assists, p.acs,
            kpr, dpr, apr,
            p.first_bloods || 0, p.first_deaths || 0, fbsr,
            p.adr || 0, p.hs_pct || 0, rounds,
          ]
        )
        savedStats.push(statRes.rows[0])
      }

      return { match, stats: savedStats }
    })

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (err) {
    const e = err as { message?: string; code?: string; detail?: string }
    console.error('[OCR save] error:', e.message, '| code:', e.code, '| detail:', e.detail)
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 })
  }
}
