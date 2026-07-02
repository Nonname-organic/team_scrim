import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { query } from '@/lib/db'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await query(
    'UPDATE user_teams SET tos_agreed_at = NOW() WHERE user_id = $1',
    [user.id]
  )

  return NextResponse.json({ ok: true })
}
