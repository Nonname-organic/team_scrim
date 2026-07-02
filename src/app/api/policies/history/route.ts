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
      updated_at: string
      summary: string | null
    }>(
      `SELECT id, policy_type, version, title, effective_date, updated_at, summary
       FROM policy_versions
       WHERE published = true
       ORDER BY effective_date DESC, policy_type, created_at DESC`
    )
    return NextResponse.json({ data: rows })
  } catch (e) {
    console.error('[api/policies/history]', e)
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 503 })
  }
}
