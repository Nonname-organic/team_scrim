import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { query, queryOne } from '@/lib/db'
import { buildMatchFeedbackPrompt } from '@/lib/ai-prompts'

export const maxDuration = 60

const client = new Anthropic()

function extractJSON(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```json\r?\n([\s\S]*?)\r?\n```/)
  if (fenced) { try { return JSON.parse(fenced[1]) } catch {} }
  const plain = text.match(/```\r?\n(\{[\s\S]*?\})\r?\n```/)
  if (plain) { try { return JSON.parse(plain[1]) } catch {} }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)) } catch {}
  }
  return null
}

function determineStyleTag(
  rounds: Record<string, unknown>[]
): 'aggressive' | 'control' | 'default' | 'mixed' {
  if (rounds.length === 0) return 'default'

  const fbRounds    = rounds.filter(r => r.first_blood_team === true).length
  const timedRounds = rounds.filter(r => r.contact_timing).length
  const earlyRounds = rounds.filter(r => r.contact_timing === 'early').length
  const lateRounds  = rounds.filter(r => r.contact_timing === 'late').length
  const plantedRounds = rounds.filter(r => r.planted === true).length

  const fbPct    = rounds.length > 0 ? fbRounds    / rounds.length  : 0
  const earlyPct = timedRounds  > 0 ? earlyRounds / timedRounds    : 0
  const latePct  = timedRounds  > 0 ? lateRounds  / timedRounds    : 0
  const plantRate = rounds.length > 0 ? plantedRounds / rounds.length : 0

  if (fbPct > 0.45 && earlyPct > 0.35) return 'aggressive'
  if (latePct > 0.4 && plantRate > 0.45) return 'control'
  if (fbPct > 0.3 && latePct > 0.2) return 'mixed'
  return 'default'
}

export async function POST(req: NextRequest) {
  try {
    const { match_id } = await req.json()
    if (!match_id) return NextResponse.json({ error: 'match_id required' }, { status: 400 })

    const match = await queryOne<Record<string, unknown>>(
      `SELECT m.*, t.name AS team_name
       FROM matches m JOIN teams t ON t.id = m.team_id
       WHERE m.id = $1`,
      [match_id]
    )
    if (!match) return NextResponse.json({ error: '試合が見つかりません' }, { status: 404 })

    const [rounds, playerStats] = await Promise.all([
      query<Record<string, unknown>>(
        `SELECT round_number, side, result, economy_type, planted, plant_site,
                first_blood_team, contact_timing, retake
         FROM rounds WHERE match_id = $1 ORDER BY round_number`,
        [match_id]
      ),
      query<Record<string, unknown>>(
        `SELECT p.ign, ps.agent, ps.kills, ps.deaths, ps.assists, ps.acs,
                ps.hs_pct, ps.first_bloods, ps.first_deaths
         FROM player_stats ps JOIN players p ON p.id = ps.player_id
         WHERE ps.match_id = $1`,
        [match_id]
      ),
    ])

    const styleTag = determineStyleTag(rounds)
    const prompt = buildMatchFeedbackPrompt(match, rounds, playerStats, styleTag)

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
    const parsed = extractJSON(rawText)

    if (!parsed) {
      console.error('[feedback/ai] JSON parse failed:', rawText.slice(0, 500))
      return NextResponse.json(
        { error: 'AI応答の解析に失敗しました。再度お試しください。' },
        { status: 500 }
      )
    }

    const strengths    = Array.isArray(parsed.strengths)    ? parsed.strengths    : []
    const weaknesses   = Array.isArray(parsed.weaknesses)   ? parsed.weaknesses   : []
    const action_items = Array.isArray(parsed.action_items) ? parsed.action_items : []
    const summary      = typeof parsed.summary === 'string' ? parsed.summary      : null
    const finalStyle   = typeof parsed.style_tag === 'string' ? parsed.style_tag  : styleTag

    const saved = await query<Record<string, unknown>>(
      `INSERT INTO feedbacks
         (match_id, team_id, type, summary, strengths, weaknesses, action_items,
          style_tag, raw_response, model_used)
       VALUES ($1, $2, 'ai', $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        match_id,
        match.team_id,
        summary,
        JSON.stringify(strengths),
        JSON.stringify(weaknesses),
        JSON.stringify(action_items),
        finalStyle,
        rawText,
        'claude-sonnet-4-6',
      ]
    )

    return NextResponse.json({ data: saved[0] })
  } catch (err) {
    console.error('[feedback/ai POST]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
