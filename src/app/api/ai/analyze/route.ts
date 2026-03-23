import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildAIContextV2 } from '@/lib/analysis'
import { buildCoachPromptV2 } from '@/lib/ai-prompts'
import { query } from '@/lib/db'

const client = new Anthropic()

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
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawAnalysis = message.content[0].type === 'text' ? message.content[0].text : ''

    let parsedReport: Record<string, unknown> | null = null
    const jsonMatch = rawAnalysis.match(/```json\n([\s\S]*?)\n```/)
    if (jsonMatch) {
      try {
        parsedReport = JSON.parse(jsonMatch[1])
      } catch {
        console.error('[AI] Failed to parse JSON response')
      }
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
        'coach_v2',
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify(parsedReport?.improvements ?? []),
        JSON.stringify([]),
        rawAnalysis,
        'claude-sonnet-4-6',
        message.usage.input_tokens + message.usage.output_tokens,
      ]
    )

    return NextResponse.json({
      data: {
        ...saved[0],
        ...parsedReport,
        raw_analysis: rawAnalysis,
      },
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
