import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, unauthorizedResponse } from '@/lib/server-auth'
import { query } from '@/lib/db'
import { hashRequestMeta } from '@/lib/logger'

type ConsentItem = { policy_type: string; version: string }

export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  let items: ConsentItem[]
  try {
    const body = await req.json()
    items = Array.isArray(body?.consents) ? body.consents : []
  } catch {
    return NextResponse.json({ error: 'リクエストが不正です' }, { status: 400 })
  }

  if (items.length === 0) {
    return NextResponse.json({ error: '同意するポリシーが指定されていません' }, { status: 400 })
  }

  const { ipHash } = hashRequestMeta(req)
  const userAgent = req.headers.get('user-agent') ?? null

  // IPハッシュから生IPは復元できないため、X-Forwarded-For を優先で生IPを取得
  const rawIp =
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    ipHash  // フォールバック: ハッシュを記録（生IP取得不可の場合）

  try {
    // INSERT OR IGNORE（既同意は無視）
    for (const item of items) {
      await query(
        `INSERT INTO user_consents (user_id, policy_type, version, consented_at, ip_address, user_agent)
         VALUES ($1, $2, $3, NOW(), $4, $5)
         ON CONFLICT (user_id, policy_type, version) DO NOTHING`,
        [auth.userId, item.policy_type, item.version, rawIp, userAgent]
      )
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[api/consent]', e)
    return NextResponse.json({ error: '同意の記録に失敗しました' }, { status: 500 })
  }
}
