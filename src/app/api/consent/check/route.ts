import { NextResponse } from 'next/server'
import { getAuthContext, unauthorizedResponse } from '@/lib/server-auth'
import { query } from '@/lib/db'

export type UnconsentedPolicy = {
  policy_type: string
  version: string
  title: string
}

export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  try {
    // 最新公開バージョンのうち未同意のもの
    const unconsented = await query<UnconsentedPolicy>(
      `SELECT pv.policy_type, pv.version, pv.title
       FROM (
         SELECT DISTINCT ON (policy_type)
           policy_type, version, title, effective_date
         FROM policy_versions
         WHERE published = true
         ORDER BY policy_type, effective_date DESC, created_at DESC
       ) pv
       WHERE NOT EXISTS (
         SELECT 1 FROM user_consents uc
         WHERE uc.user_id = $1
           AND uc.policy_type = pv.policy_type
           AND uc.version = pv.version
       )`,
      [auth.userId]
    )

    return NextResponse.json({
      needs_consent: unconsented.length > 0,
      unconsented,
    })
  } catch (e) {
    console.error('[api/consent/check]', e)
    // テーブルが存在しない等のDB障害は同意不要として扱う（サービス継続優先）
    return NextResponse.json({ needs_consent: false, unconsented: [] })
  }
}
