import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildAIContext } from '@/lib/analysis'
import { buildCoachPrompt } from '@/lib/ai-prompts'
import { query } from '@/lib/db'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { team_id, match_id, report_type = 'post_match' } = await req.json()

    if (!team_id) {
      return NextResponse.json({ error: 'team_id is required' }, { status: 400 })
    }

    // Build comprehensive context from DB
    const context = await buildAIContext(team_id, match_id)

    // Check if we have enough data
    if (!context.team_win_rates.length && !context.player_stats.length) {
      return NextResponse.json(
        { error: 'Insufficient data. Please add at least 3 matches before requesting AI analysis.' },
        { status: 422 }
      )
    }

    const prompt = buildCoachPrompt(context as Record<string, unknown>)

    // Call Claude API
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const rawAnalysis = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON from response
    let parsedReport = null
    const jsonMatch = rawAnalysis.match(/```json\n([\s\S]*?)\n```/)
    if (jsonMatch) {
      try {
        parsedReport = JSON.parse(jsonMatch[1])
      } catch {
        console.error('Failed to parse AI JSON response')
      }
    }

    // Save report to DB
    const saved = await query(
      `INSERT INTO ai_reports
         (team_id, match_id, report_type, loss_reasons, win_patterns,
          improvements, player_feedback, raw_analysis, model_used, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        team_id,
        match_id || null,
        report_type,
        JSON.stringify(parsedReport?.loss_reasons ?? []),
        JSON.stringify(parsedReport?.win_patterns ?? []),
        JSON.stringify(parsedReport?.improvements ?? []),
        JSON.stringify(parsedReport?.player_feedback ?? []),
        rawAnalysis,
        'claude-sonnet-4-6',
        message.usage.input_tokens + message.usage.output_tokens,
      ]
    )

    return NextResponse.json({ data: saved[0] })
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
