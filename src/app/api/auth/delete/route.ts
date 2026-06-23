import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { query, queryOne } from '@/lib/db'
import { getAuthContext } from '@/lib/server-auth'

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { password } = await req.json()
    if (!password) return NextResponse.json({ error: 'パスワードが必要です' }, { status: 400 })

    // Get user email for re-authentication
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return NextResponse.json({ error: 'ユーザー情報を取得できません' }, { status: 400 })

    // Re-authenticate with current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    })
    if (signInError) {
      return NextResponse.json({ error: 'パスワードが正しくありません' }, { status: 403 })
    }

    const { userId, teamId } = auth

    // Delete all team data in order (FK constraints)
    await query(`DELETE FROM feedbacks    WHERE match_id IN (SELECT id FROM matches WHERE team_id = $1)`, [teamId])
    await query(`DELETE FROM rounds       WHERE match_id IN (SELECT id FROM matches WHERE team_id = $1)`, [teamId])
    await query(`DELETE FROM player_stats WHERE match_id IN (SELECT id FROM matches WHERE team_id = $1)`, [teamId])
    await query(`DELETE FROM matches  WHERE team_id = $1`, [teamId])
    await query(`DELETE FROM players  WHERE team_id = $1`, [teamId])
    await query(`DELETE FROM user_teams WHERE user_id = $1`, [userId])
    await query(`DELETE FROM teams    WHERE id = $1`, [teamId])

    // Delete Supabase auth user (requires service role key)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
      await adminClient.auth.admin.deleteUser(userId)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[auth/delete]', err)
    return NextResponse.json({ error: 'アカウント削除に失敗しました' }, { status: 500 })
  }
}
