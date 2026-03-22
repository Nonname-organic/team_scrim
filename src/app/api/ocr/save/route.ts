import { NextRequest, NextResponse } from 'next/server'
import { withTransaction } from '@/lib/db'

// ============================================================
// OCR結果を試合 + プレイヤースタッツとして一括保存
// ============================================================

interface PlayerEntry {
  player_id: string | null   // 登録済みプレイヤーのID（nullなら相手チーム）
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

interface SaveOcrRequest {
  team_id: string
  opponent_name: string
  match_date: string
  map: string
  match_type: string
  team_score: number
  opponent_score: number
  attack_rounds_won: number
  attack_rounds_played: number
  defense_rounds_won: number
  defense_rounds_played: number
  scoreboard_image_url?: string
  players: PlayerEntry[]
}

export async function POST(req: NextRequest) {
  try {
    const body: SaveOcrRequest = await req.json()

    const {
      team_id, opponent_name, match_date, map, match_type,
      team_score, opponent_score,
      attack_rounds_won = 0, attack_rounds_played = 0,
      defense_rounds_won = 0, defense_rounds_played = 0,
      scoreboard_image_url,
      players,
    } = body

    if (!team_id || !opponent_name || !map || !players?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const result = await withTransaction(async (client) => {
      // 1. 試合を保存
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
          team_id, opponent_name, match_date, map, match_type,
          team_score, opponent_score,
          attack_rounds_won, attack_rounds_played,
          defense_rounds_won, defense_rounds_played,
          scoreboard_image_url ?? null,
        ]
      )
      const match = matchRes.rows[0]
      const matchId = match.id

      // 2. 自チームプレイヤーのスタッツを保存（player_idがあるもののみ）
      const savedStats = []
      const totalRounds = team_score + opponent_score

      for (const p of players) {
        if (!p.player_id) continue  // 相手チームはスキップ

        const rounds = p.rounds_played || totalRounds
        const kpr = rounds > 0 ? p.kills / rounds : 0
        const dpr = rounds > 0 ? p.deaths / rounds : 0
        const apr = rounds > 0 ? p.assists / rounds : 0
        const fbsr = (p.first_bloods + p.first_deaths) > 0
          ? p.first_bloods / (p.first_bloods + p.first_deaths)
          : 0

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
    console.error('[OCR save]', err)
    return NextResponse.json(
      { error: 'Save failed', details: String(err) },
      { status: 500 }
    )
  }
}
