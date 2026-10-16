import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAuthContext, unauthorizedResponse } from '@/lib/server-auth'

// Vision 呼び出しは 20 秒超かかるため Vercel デフォルト(10s)では足りない
export const maxDuration = 60

const client = new Anthropic()

// ============================================================
// OCR: Scoreboard Image → Player Stats
// Vision API (Claude) approach
// ============================================================

export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

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
    const base64 = buffer.toString('base64')
    const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp'

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

              【マップ名】画像内のマップ表記（例: 右上の「マップ - ロータス」/ "MAP - LOTUS"）を読み取り、
              map フィールドは必ず次の英語名のいずれかで返してください（日本語表記→英語名の対応）：
              アビス→Abyss, アセント→Ascent, バインド→Bind, ブリーズ→Breeze, フラクチャー→Fracture,
              ヘイヴン→Haven, アイスボックス→Icebox, ロータス→Lotus, パール→Pearl, スプリット→Split, サンセット→Sunset
              画像から読み取れない場合は "${mapName || 'unknown'}" としてください。

              以下の形式のJSONで返してください：

              \`\`\`json
              {
                "map": "英語マップ名",
                "team_score": 数値,
                "opponent_score": 数値,
                "players": [
                  {
                    "ign": "プレイヤー名",
                    "agent": "エージェント名（日本語カタカナ）",
                    "kills": 数値,
                    "deaths": 数値,
                    "assists": 数値,
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
              スコアボードの列は「KDA（K/D/A）」「ファーストキル→first_bloods」の対応で読み取り、
              「設置」「解除」列は無視してください。表示されていない項目（ADR, HS% など）は null にしてください。
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
    // 原因特定のため失敗理由をそのまま返す（自チーム向けツールのため許容）
    const details = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: `OCR処理に失敗しました: ${details}` }, { status: 500 })
  }
}
