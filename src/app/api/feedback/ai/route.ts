import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { query, queryOne } from '@/lib/db'
import { buildTacticalFeedbackPrompt } from '@/lib/ai-prompts'

export const maxDuration = 60

// ── Tool schema — 7-step tactical framework ───────────────────────────────────
const ANALYSIS_TOOL: Anthropic.Tool = {
  name: 'submit_analysis',
  description: '試合の7ステップ戦術分析結果を構造化データとして提出する',
  input_schema: {
    type: 'object' as const,
    properties: {
      // ステップ0: 試合評価サマリ
      round_evaluation: { type: 'string', description: '試合の戦術的評価（2〜3文、数値引用必須）' },
      win_factor:       { type: 'string', description: '勝敗を分けた本質的要因（1文、行動として）' },
      // ステップ1: 意図の推測
      intent_assessment: { type: 'string', description: 'チームが何を狙ったかの推測（結果からではなく構造から、1〜2文）' },
      // ステップ2: 期待値評価
      ev_evaluation: {
        type: 'object',
        properties: {
          verdict:   { type: 'string', enum: ['rational', 'irrational', 'situational'], description: 'rational=合理的 / irrational=非合理 / situational=状況依存' },
          reasoning: { type: 'string', description: '期待値評価の根拠（数値引用必須）' },
        },
        required: ['verdict', 'reasoning'],
      },
      // ステップ3: 崩壊点特定
      breakdown_points: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            round:       { type: 'string', description: 'ラウンド番号（例: R12）' },
            moment:      { type: 'string', description: '崩壊したタイミング（状況として）' },
            description: { type: 'string', description: '何が起きたか（行動として）' },
          },
          required: ['round', 'moment', 'description'],
        },
        description: '最大3件',
      },
      // ステップ4: 原因分離
      cause_analysis: {
        type: 'object',
        properties: {
          structural:  { type: 'array', items: { type: 'string' }, description: '構造問題：戦術・配置・マクロ' },
          execution:   { type: 'array', items: { type: 'string' }, description: '実行問題：撃ち合い・スキル' },
          judgment:    { type: 'array', items: { type: 'string' }, description: '判断問題：ローテ・コール' },
          information: { type: 'array', items: { type: 'string' }, description: '情報問題：取得不足・誤認識' },
        },
        required: ['structural', 'execution', 'judgment', 'information'],
      },
      // ステップ5: 再現性評価
      reproducibility: {
        type: 'object',
        properties: {
          verdict:  { type: 'string', enum: ['repeatable', 'coincidence', 'mixed'], description: 'repeatable=再現可能 / coincidence=偶然 / mixed=混在' },
          evidence: { type: 'string', description: '判定の根拠（数値引用必須）' },
        },
        required: ['verdict', 'evidence'],
      },
      // ステップ6: 改善提案（who/when/what/why）
      improvements: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            who:  { type: 'string', description: '誰が（選手名またはチーム全体）' },
            when: { type: 'string', description: 'いつ（状況・フェーズを具体的に）' },
            what: { type: 'string', description: '何をする（動詞で始める具体的行動）' },
            why:  { type: 'string', description: 'なぜ（期待値・因果関係を明示）' },
          },
          required: ['who', 'when', 'what', 'why'],
        },
        description: '最大4件',
      },
      // ステップ7: ルール化
      rules: {
        type: 'array', items: { type: 'string' },
        description: 'if-then形式のチームルール（例: if Bサイトでピーク距離が遠い場合 then 必ずフラッシュ先投げする）',
      },
      pattern_flags: {
        type: 'array', items: { type: 'string' },
        description: '複数ラウンドで繰り返されているパターン・癖（行動として）',
      },
      score_macro:    { type: 'number', description: 'マクロ戦術スコア 0-100' },
      score_micro:    { type: 'number', description: 'ミクロ・個人スコア 0-100' },
      score_teamplay: { type: 'number', description: 'チームプレイスコア 0-100' },
      score_overall:  { type: 'number', description: '総合スコア 0-100' },
    },
    required: [
      'round_evaluation', 'win_factor',
      'intent_assessment', 'ev_evaluation', 'breakdown_points',
      'cause_analysis', 'reproducibility', 'improvements',
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

    const systemPrompt = `あなたはTier1 VALORANTチーム専属の戦術アナリスト兼ヘッドコーチです。
役割は「試合を説明すること」ではない。
目的：勝敗の再現性を高め、チーム戦術の期待値を最大化し、意思決定ミスを構造化し、再発防止ルールを定義すること。
分析は7ステップフレームワーク（意図推測・EV評価・崩壊点特定・原因分離・再現性評価・改善提案・ルール化）に従うこと。
禁止：抽象論・精神論・結果論・数値なし根拠。必ず submit_analysis ツールを呼び出して結果を提出すること。`

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
    const round_evaluation = String(inp.round_evaluation ?? '')
    const win_factor       = String(inp.win_factor ?? '')

    type Improvement = { who: string; when: string; what: string; why: string }
    type CauseAnalysis = { structural: string[]; execution: string[]; judgment: string[]; information: string[] }
    const improvements   = (inp.improvements as Improvement[]) ?? []
    const cause_analysis = (inp.cause_analysis as CauseAnalysis) ?? { structural: [], execution: [], judgment: [], information: [] }

    // weaknesses: cause_analysis の全カテゴリをラベル付きフラット化
    const weaknesses = [
      ...cause_analysis.structural.map(s  => `[構造] ${s}`),
      ...cause_analysis.execution.map(s   => `[実行] ${s}`),
      ...cause_analysis.judgment.map(s    => `[判断] ${s}`),
      ...cause_analysis.information.map(s => `[情報] ${s}`),
    ]

    // action_items: who/when/what を自然文に変換
    const action_items = improvements.map(imp =>
      `${imp.who}が${imp.when}に${imp.what}`
    )

    // raw_response: 全フィールドを保存（フロントエンドで表示用）
    const rawPayload = JSON.stringify({
      round_evaluation,
      win_factor,
      intent_assessment:  inp.intent_assessment,
      ev_evaluation:      inp.ev_evaluation,
      breakdown_points:   inp.breakdown_points,
      cause_analysis:     inp.cause_analysis,
      reproducibility:    inp.reproducibility,
      improvements,
      rules:              inp.rules,
      pattern_flags:      inp.pattern_flags,
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
    console.error('[feedback/ai POST]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
