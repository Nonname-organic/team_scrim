import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { query, queryOne } from '@/lib/db'
import { buildTacticalFeedbackPrompt } from '@/lib/ai-prompts'

export const maxDuration = 60

// ── Tool schema — forces Claude to return structured JSON ─────────────────────
const ANALYSIS_TOOL: Anthropic.Tool = {
  name: 'submit_analysis',
  description: '試合の戦術分析結果を構造化データとして提出する',
  input_schema: {
    type: 'object' as const,
    properties: {
      round_evaluation: { type: 'string', description: 'この試合の戦術的評価（2〜3文、数値引用必須）' },
      win_factor:       { type: 'string', description: '勝敗を分けた本質的要因（1文、行動として）' },
      good_points: {
        type: 'array', items: { type: 'string' },
        description: '具体的な良かった点（行動として）',
      },
      issues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            issue:    { type: 'string', description: '何が起きたか（行動として）' },
            impact:   { type: 'string', description: 'なぜ勝敗に影響するか（因果関係）' },
            priority: { type: 'string', enum: ['high', 'mid', 'low'] },
          },
          required: ['issue', 'impact', 'priority'],
        },
      },
      root_causes: {
        type: 'array', items: { type: 'string' },
        description: 'なぜ問題が発生したか（判断・習慣・情報不足）',
      },
      team_improvements: {
        type: 'array', items: { type: 'string' },
        description: 'チームとして変える行動',
      },
      individual_improvements: {
        type: 'array', items: { type: 'string' },
        description: '個人として変える行動',
      },
      rules: {
        type: 'array', items: { type: 'string' },
        description: 'チームルール（if-then形式推奨）',
      },
      pattern_flags: {
        type: 'array', items: { type: 'string' },
        description: '繰り返しているパターン・癖',
      },
      score_macro:    { type: 'number', description: 'マクロ戦術スコア 0-100' },
      score_micro:    { type: 'number', description: 'ミクロ・個人スコア 0-100' },
      score_teamplay: { type: 'number', description: 'チームプレイスコア 0-100' },
      score_overall:  { type: 'number', description: '総合スコア 0-100' },
    },
    required: [
      'round_evaluation', 'win_factor', 'good_points', 'issues',
      'root_causes', 'team_improvements', 'individual_improvements',
      'rules', 'pattern_flags',
      'score_macro', 'score_micro', 'score_teamplay', 'score_overall',
    ],
  },
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY が設定されていません' }, { status: 503 })
  }

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

    const systemPrompt = `あなたはプロe-sportsチームの戦術アナリスト兼ヘッドコーチです。
目的は「勝敗の再現性を高めること」です。
分析原則：勝敗の本質的原因を特定し、因果関係を分解し、改善を行動単位で提示し、再現可能なルールに変換する。
禁止：抽象的な精神論・結果論のみの指摘・説明不足。必ず submit_analysis ツールを呼び出して結果を提出すること。`

    const userMessage = buildTacticalFeedbackPrompt(match, rounds, playerStats)

    const client = new Anthropic()
    const message = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system:     systemPrompt,
      tools:      [ANALYSIS_TOOL],
      tool_choice: { type: 'tool', name: 'submit_analysis' },
      messages:   [{ role: 'user', content: userMessage }],
    })

    // tool_use ブロックから入力を取得
    const toolUse = message.content.find(b => b.type === 'tool_use') as Anthropic.ToolUseBlock | undefined
    if (!toolUse) {
      console.error('[feedback/ai] tool_use block not found. stop_reason:', message.stop_reason)
      return NextResponse.json(
        { error: 'AI分析の取得に失敗しました。再度お試しください。' },
        { status: 500 }
      )
    }

    const inp = toolUse.input as Record<string, unknown>

    // ── Map tool input → DB columns ───────────────────────────────────────────
    const round_evaluation      = String(inp.round_evaluation ?? '')
    const good_points           = (inp.good_points as string[]) ?? []
    const issues                = (inp.issues as Record<string, unknown>[]) ?? []
    const team_improvements     = (inp.team_improvements as string[]) ?? []
    const individual_improvements = (inp.individual_improvements as string[]) ?? []

    const weaknesses   = issues.map(iss =>
      `[${String(iss.priority).toUpperCase()}] ${iss.issue} — ${iss.impact}`
    )
    const action_items = [...team_improvements, ...individual_improvements]

    // raw_response: 表示用に完全な構造を保存
    const rawPayload = JSON.stringify({
      round_evaluation,
      win_factor:    inp.win_factor,
      good_points,
      issues,
      root_causes:   inp.root_causes,
      improvements:  { team: team_improvements, individual: individual_improvements },
      rules:         inp.rules,
      pattern_flags: inp.pattern_flags,
      score: {
        macro:    inp.score_macro,
        micro:    inp.score_micro,
        teamplay: inp.score_teamplay,
        overall:  inp.score_overall,
      },
    })

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
        rawPayload,
        'claude-sonnet-4-6',
      ]
    )

    return NextResponse.json({ data: saved[0] })
  } catch (err) {
    console.error('[feedback/ai POST]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
