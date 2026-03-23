import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// ============================================================
// OCR: Scoreboard Image → Player Stats
// Vision API (Claude) approach
// ============================================================

export async function POST(req: NextRequest) {
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

              以下の形式のJSONで返してください：

              \`\`\`json
              {
                "map": "${mapName || 'unknown'}",
                "team_score": 数値,
                "opponent_score": 数値,
                "players": [
                  {
                    "ign": "プレイヤー名",
                    "agent": "エージェント名",
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

    // Extract JSON
    const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/)
    if (!jsonMatch) {
      return NextResponse.json(
        { success: false, error: 'Could not parse scoreboard', raw_text: rawText },
        { status: 422 }
      )
    }

    const parsed = JSON.parse(jsonMatch[1])

    return NextResponse.json({ success: true, ...parsed })
  } catch (err) {
    console.error('[OCR]', err)
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    )
  }
}
