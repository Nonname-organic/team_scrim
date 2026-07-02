import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { query, queryOne } from '@/lib/db'
import { buildTacticalFeedbackPrompt } from '@/lib/ai-prompts'
import { getAuthContext, unauthorizedResponse } from '@/lib/server-auth'
import { guardWrite } from '@/lib/api-guard'
import { serverError } from '@/lib/api-error'

export const maxDuration = 60

// ── Tool schema — compact (fits in ~600 tokens → ~6s on Haiku) ───────────────
// 11フィールドの7ステップ版は3300トークン/30秒かかり Vercel Hobby(10s上限)でタイムアウト。
// 最重要6フィールドに絞ることで ~600トークン/6秒 に収める。
const ANALYSIS_TOOL: Anthropic.Tool = {
  name: 'submit_analysis',
  description: '試合の戦術分析結果（各テキストは1〜2文で簡潔に）',
  input_schema: {
    type: 'object' as const,
    properties: {
      score: {
        type: 'object',
        description: '戦術スコア（各0-100の整数）',
        properties: {
          macro:    { type: 'number', description: 'マクロ戦術 0-100' },
          micro:    { type: 'number', description: 'ミクロ・個人 0-100' },
          teamplay: { type: 'number', description: 'チームプレイ 0-100' },
          overall:  { type: 'number', description: '総合 0-100' },
        },
        required: ['macro', 'micro', 'teamplay', 'overall'],
      },
      win_factor:       { type: 'string', description: '勝敗を分けた本質的要因（1文・行動として・数値引用）' },
      round_evaluation: { type: 'string', description: '試合の戦術的評価（2文・数値引用必須）' },
      improvements: {
        type: 'array',
        items: { type: 'string', description: '具体的な改善アクション（1文・動詞で始める）' },
        description: '最大3件',
      },
      rules: {
        type: 'array',
        items: { type: 'string', description: 'if-then形式のチームルール（1文）' },
        description: '最大2件',
      },
      pattern_flags: {
        type: 'array',
        items: { type: 'string', description: '繰り返すパターン・癖（行動として・短く）' },
        description: '最大2件',
      },
    },
    required: ['score', 'win_factor', 'round_evaluation', 'improvements', 'rules', 'pattern_flags'],
  },
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  const limited = await guardWrite(auth, req, '/api/feedback/ai')
  if (limited) return limited

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI機能は現在利用できません' }, { status: 503 })
  }

  try {
    const { match_id, locale } = await req.json()
    if (!match_id) return NextResponse.json({ error: 'match_id required' }, { status: 400 })
    const isEN = locale === 'en'

    const match = await queryOne<Record<string, unknown>>(
      `SELECT m.*, t.name AS team_name
       FROM matches m JOIN teams t ON t.id = m.team_id
       WHERE m.id = $1 AND m.team_id = $2`,
      [match_id, auth.teamId]
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

    const systemPrompt = isEN
      ? `You are a VALORANT head coach and tactical analyst. Call submit_analysis with your results.
CRITICAL: Every text field must be 1-2 sentences maximum. Be concise and data-driven. No abstractions.
All text fields MUST be written entirely in English.`
      : `あなたはVALORANTヘッドコーチ兼戦術アナリスト。必ず submit_analysis ツールを呼び出すこと。
重要：各テキストフィールドは最大1〜2文。簡潔・数値引用必須。抽象論・精神論禁止。`

    const userMessage = buildTacticalFeedbackPrompt(match, rounds, playerStats)

    const client = new Anthropic()
    const message = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1200,
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
    const round_evaluation = String(inp.round_evaluation ?? '')
    const win_factor       = String(inp.win_factor ?? '')
    const improvements     = (inp.improvements   as string[]) ?? []
    const rules            = (inp.rules          as string[]) ?? []
    const pattern_flags    = (inp.pattern_flags  as string[]) ?? []

    const weaknesses   = pattern_flags   // 繰り返すパターン = 弱点
    const action_items = improvements    // 改善アクション

    const scoreObj = (inp.score ?? {}) as Record<string, unknown>
    const rawPayload = JSON.stringify({
      round_evaluation,
      win_factor,
      improvements,
      rules,
      pattern_flags,
      score: {
        macro:    Number(scoreObj.macro    ?? 0) || 0,
        micro:    Number(scoreObj.micro    ?? 0) || 0,
        teamplay: Number(scoreObj.teamplay ?? 0) || 0,
        overall:  Number(scoreObj.overall  ?? 0) || 0,
      },
    })

    // 既存のAI分析を削除して上書き
    await query('DELETE FROM feedbacks WHERE match_id = $1 AND type = $2', [match_id, 'ai'])

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
        JSON.stringify([win_factor].filter(Boolean)),
        JSON.stringify(weaknesses),
        JSON.stringify(action_items),
        null,
        rawPayload,
        'claude-haiku-4-5-20251001',
      ]
    )

    return NextResponse.json({ data: saved[0] })
  } catch (err) {
    return serverError('feedback/ai POST', err)
  }
}
