import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { query, queryOne } from '@/lib/db'
import { buildTacticalFeedbackPrompt } from '@/lib/ai-prompts'

export const maxDuration = 60

const client = new Anthropic()

function repairJSON(s: string): string {
  // Remove JS-style comments
  s = s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  // Remove trailing commas before } or ]
  s = s.replace(/,(\s*[}\]])/g, '$1')
  return s
}

function extractJSON(text: string): Record<string, unknown> | null {
  // Try every ```json or ``` block in reverse order (last = actual output)
  const blocks = [...text.matchAll(/```(?:json)?\s*\r?\n([\s\S]*?)\r?\n\s*```/g)]
  for (const block of blocks.reverse()) {
    const candidate = block[1].trim()
    if (!candidate.startsWith('{')) continue
    try { return JSON.parse(candidate) } catch {}
    try { return JSON.parse(repairJSON(candidate)) } catch {}
  }
  // Raw JSON: find the outermost { }
  const start = text.indexOf('{')
  const end   = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    const slice = text.slice(start, end + 1)
    try { return JSON.parse(slice) } catch {}
    try { return JSON.parse(repairJSON(slice)) } catch {}
  }
  return null
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
                first_blood_team, contact_timing, retake, notable
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

    const prompt  = buildTacticalFeedbackPrompt(match, rounds, playerStats)
    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2000,
      messages:   [{ role: 'user', content: prompt }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
    const parsed  = extractJSON(rawText)

    if (!parsed) {
      console.error('[feedback/ai] JSON parse failed. Raw (first 600):', rawText.slice(0, 600))
      return NextResponse.json(
        {
          error: 'AI応答の解析に失敗しました。再度お試しください。',
          debug_preview: rawText.slice(0, 300),
        },
        { status: 500 }
      )
    }

    // ── Map new schema → DB columns ──────────────────────────────────────────
    const round_evaluation = typeof parsed.round_evaluation === 'string' ? parsed.round_evaluation : null
    const good_points      = Array.isArray(parsed.good_points) ? parsed.good_points as string[] : []
    const issues           = Array.isArray(parsed.issues) ? parsed.issues as Record<string, unknown>[] : []
    const improv           = parsed.improvements as Record<string, unknown> | null
    const team_improvements = Array.isArray(improv?.team) ? improv!.team as string[] : []
    const indv_improvements = Array.isArray(improv?.individual) ? improv!.individual as string[] : []

    // weaknesses: issues formatted with priority tag
    const weaknesses = issues.map(iss =>
      `[${(iss.priority as string)?.toUpperCase() ?? 'MID'}] ${iss.issue} — ${iss.impact}`
    )

    const action_items = [...team_improvements, ...indv_improvements]

    const saved = await query<Record<string, unknown>>(
      `INSERT INTO feedbacks
         (match_id, team_id, type, summary, strengths, weaknesses, action_items,
          style_tag, raw_response, model_used)
       VALUES ($1, $2, 'ai', $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        match_id,
        match.team_id,
        round_evaluation,
        JSON.stringify(good_points),
        JSON.stringify(weaknesses),
        JSON.stringify(action_items),
        null,
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
