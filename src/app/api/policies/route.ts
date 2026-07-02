import { NextResponse } from 'next/server'
import { getAuthContext, unauthorizedResponse } from '@/lib/server-auth'
import { query } from '@/lib/db'

export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return unauthorizedResponse()

  try {
    const rows = await query<{
      id: string
      policy_type: string
      version: string
      title: string
      effective_date: string
      summary: string | null
    }>(
      `SELECT DISTINCT ON (policy_type)
         id, policy_type, version, title, effective_date, summary
       FROM policy_versions
       WHERE published = true
       ORDER BY policy_type, effective_date DESC, created_at DESC`
    )
    return NextResponse.json({ data: rows })
  } catch (e) {
    console.error('[api/policies]', e)
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 503 })
  }
}
