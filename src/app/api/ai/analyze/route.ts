import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildAIContextV2 } from '@/lib/analysis'
import { buildCoachPromptV2 } from '@/lib/ai-prompts'
import { query } from '@/lib/db'

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

export async function POST(req: NextRequest) {
  try {
    const { team_id, match_ids, map_filter } = await req.json()

    if (!team_id) {
      return NextResponse.json({ error: 'team_id is required' }, { status: 400 })
    }

    const context = await buildAIContextV2(team_id, {
      matchIds: match_ids?.length ? match_ids : undefined,
      mapFilter: map_filter || undefined,
    })

    if (!context.match_details.length) {
      return NextResponse.json(
        { error: 'データが見つかりません。試合データを追加してから分析してください。' },
        { status: 422 }
      )
    }

    const prompt = buildCoachPromptV2(context as Record<string, unknown>)

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawAnalysis = message.content[0].type === 'text' ? message.content[0].text : ''

    const parsedReport = extractJSON(rawAnalysis)
    if (!parsedReport) {
      console.error('[AI] Failed to parse JSON:', rawAnalysis.slice(0, 500))
      return NextResponse.json(
        { error: 'AIの応答をJSON形式で解析できませんでした。再度お試しください。' },
        { status: 500 }
      )
    }

    const saved = await query(
      `INSERT INTO ai_reports
         (team_id, match_id, report_type, loss_reasons, win_patterns,
          improvements, player_feedback, raw_analysis, model_used, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        team_id,
        null,
        'coach_v3',
        JSON.stringify((parsedReport.pattern_analysis as Record<string, unknown>)?.loss_patterns ?? []),
        JSON.stringify((parsedReport.pattern_analysis as Record<string, unknown>)?.win_patterns ?? []),
        JSON.stringify((parsedReport.macro_analysis as Record<string, unknown>)?.improvement_actions ?? []),
        JSON.stringify(parsedReport.player_feedback ?? []),
        rawAnalysis,
        'claude-sonnet-4-6',
        message.usage.input_tokens + message.usage.output_tokens,
      ]
    )

    return NextResponse.json({
      data: { ...saved[0], ...parsedReport, raw_analysis: rawAnalysis },
    })
  } catch (err) {
    console.error('[AI analyze]', err)
    return NextResponse.json(
      { error: 'AI analysis failed', details: String(err) },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get('team_id')
  const limit = Number(searchParams.get('limit') ?? 10)

  if (!teamId) {
    return NextResponse.json({ error: 'team_id required' }, { status: 400 })
  }

  const reports = await query(
    `SELECT * FROM ai_reports WHERE team_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [teamId, limit]
  )

  return NextResponse.json({ data: reports })
}
