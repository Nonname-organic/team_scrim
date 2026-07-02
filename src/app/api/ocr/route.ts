import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAuthContext, unauthorizedResponse } from '@/lib/server-auth'
import { isRateLimited, rateLimitedResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { validateImage } from '@/lib/file-validation'
import { logger, hashRequestMeta, newRequestId } from '@/lib/logger'

const client = new Anthropic()

// ============================================================
// OCR: Scoreboard Image → Player Stats
// Vision API (Claude) approach
// ============================================================

export async function POST(req: NextRequest) {
  const requestId = newRequestId()
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  const { ipHash, userAgentHash } = hashRequestMeta(req)

  // ── Rate limit: 5回/分（バースト・DoS 抑止） ──
  if (await isRateLimited(RATE_LIMITS.ocrPerMinute(auth.userId))) {
    logger.security({
      eventType: 'rate_limit_exceeded',
      requestId, teamId: auth.teamId, userId: auth.userId,
      path: '/api/ocr', ipHash, userAgentHash, message: 'ocr per-minute limit',
    })
    return rateLimitedResponse()
  }

  try {
    const formData = await req.formData()
    const file = formData.get('image') as File
    const mapName = formData.get('map') as string

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Read file as base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // ── ファイル検証: サイズ / MIME / マジックバイト ──
    const v = validateImage(buffer, file.type)
    if (!v.ok || !v.mediaType) {
      logger.security({
        eventType: 'invalid_upload',
        requestId, teamId: auth.teamId, userId: auth.userId,
        path: '/api/ocr', ipHash, userAgentHash,
        message: v.error ?? 'invalid image',
        context: { declared_type: file.type, size: buffer.length },
      })
      return NextResponse.json({ success: false, error: v.error }, { status: v.status ?? 415 })
    }

    const base64 = buffer.toString('base64')
    const mediaType = v.mediaType

    // Use Claude Vision to extract scoreboard data
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: `このVALORANTのスコアボード画像からデータを抽出してください。

              【重要】agent フィールドは必ず日本語カタカナで返してください。
              例：Sage→セージ, Jett→ジェット, Reyna→レイナ, Omen→オーメン,
                  Sova→ソーヴァ, Killjoy→キルジョイ, Cypher→サイファー,
                  Viper→ヴァイパー, Brimstone→ブリムストーン, Phoenix→フェニックス,
                  Raze→レイズ, Breach→ブリーチ, Skye→スカイ, Yoru→ヨル,
                  Astra→アストラ, Kay/O→ケイオー, Chamber→チェンバー,
                  Neon→ネオン, Fade→フェイド, Harbor→ハーバー,
                  Gekko→ゲッコー, Deadlock→デッドロック, Iso→アイソ,
                  Clove→クローブ, Vyse→ヴァイス, Tejo→テホ,
                  Waylay→ウェイレイ, Mixes→ミクス

              以下の形式のJSONで返してください：

              \`\`\`json
              {
                "map": "${mapName || 'unknown'}",
                "team_score": 数値,
                "opponent_score": 数値,
                "players": [
                  {
                    "ign": "プレイヤー名",
                    "agent": "エージェント名（日本語カタカナ）",
                    "kills": 数値,
                    "deaths": 数値,
                    "assists": 数値,
                    "acs": 数値,
                    "adr": 数値または null,
                    "hs_pct": 数値または null,
                    "first_bloods": 数値または null,
                    "first_deaths": 数値または null,
                    "team": "我々のチーム" または "相手チーム"
                  }
                ],
                "confidence": 0.0-1.0,
                "notes": "読み取りで不確かな点があれば記載"
              }
              \`\`\`

              数値が読み取れない場合は null にしてください。
              チームの区別は画像のチームカラーや配置から判断してください。`,
            },
          ],
        },
      ],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON — コードブロック形式または生JSONどちらも受け入れる
    const codeBlock = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    const rawJson   = rawText.match(/(\{[\s\S]*\})/)
    const jsonStr   = codeBlock?.[1] ?? rawJson?.[0]
    if (!jsonStr) {
      return NextResponse.json(
        { success: false, error: 'Could not parse scoreboard', raw_text: rawText },
        { status: 422 }
      )
    }

    const parsed = JSON.parse(jsonStr)

    return NextResponse.json({ success: true, ...parsed })
  } catch (err) {
    console.error('[OCR]', err)
    return NextResponse.json({ success: false, error: 'OCR処理に失敗しました' }, { status: 500 })
  }
}
