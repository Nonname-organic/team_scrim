import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, unauthorizedResponse } from '@/lib/server-auth'
import { queryOne } from '@/lib/db'

const VALID_TYPES = ['terms', 'data_policy', 'privacy', 'security'] as const

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  const { type } = await params
  if (!VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
    return NextResponse.json({ error: '無効なポリシー種別です' }, { status: 400 })
  }

  const version = req.nextUrl.searchParams.get('version')

  try {
    const row = version
      ? await queryOne(
          `SELECT id, policy_type, version, title, content, effective_date, updated_at, summary
           FROM policy_versions
           WHERE policy_type = $1 AND version = $2 AND published = true`,
          [type, version]
        )
      : await queryOne(
          `SELECT id, policy_type, version, title, content, effective_date, updated_at, summary
           FROM policy_versions
           WHERE policy_type = $1 AND published = true
           ORDER BY effective_date DESC, created_at DESC
           LIMIT 1`,
          [type]
        )

    if (!row) return NextResponse.json({ error: 'ポリシーが見つかりません' }, { status: 404 })
    return NextResponse.json({ data: row })
  } catch (e) {
    console.error(`[api/policies/${type}]`, e)
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 503 })
  }
}
