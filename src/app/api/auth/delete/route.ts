import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { withTransaction } from '@/lib/db'
import { getAuthContext } from '@/lib/server-auth'
import { logger, hashRequestMeta, newRequestId } from '@/lib/logger'

export async function DELETE(req: NextRequest) {
  const requestId = newRequestId()
  const { ipHash, userAgentHash } = hashRequestMeta(req)

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
      logger.security({
        eventType: 'account_delete_auth_failed',
        requestId, userId: user.id, teamId: auth.teamId,
        path: '/api/auth/delete', ipHash, userAgentHash,
      })
      return NextResponse.json({ error: 'パスワードが正しくありません' }, { status: 403 })
    }

    const { userId, teamId } = auth

    // ── Guard: auth.users を削除できない環境ではゾンビアカウントを生むため中止 ──
    // SERVICE_ROLE_KEY 未設定時は DB も一切削除せず整合性を保つ
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error({
        requestId, userId, teamId, errorCode: 'account_delete_no_service_key',
        message: 'SUPABASE_SERVICE_ROLE_KEY not configured; account deletion aborted',
      })
      return NextResponse.json(
        { error: 'アカウント削除機能が一時的に利用できません。運営にお問い合わせください。' },
        { status: 503 }
      )
    }

    // ── 全チームデータを 1 トランザクションで削除（子 → 親の順） ──
    // 途中失敗時は自動 ROLLBACK され、部分削除は残らない。
    await withTransaction(async (client) => {
      const matchScope = `(SELECT id FROM matches WHERE team_id = $1)`
      await client.query(`DELETE FROM feedbacks    WHERE match_id IN ${matchScope} OR team_id = $1`, [teamId])
      await client.query(`DELETE FROM events        WHERE match_id IN ${matchScope}`, [teamId])
      await client.query(`DELETE FROM team_stats    WHERE match_id IN ${matchScope} OR team_id = $1`, [teamId])
      await client.query(`DELETE FROM ai_reports    WHERE team_id = $1 OR match_id IN ${matchScope}`, [teamId])
      await client.query(`DELETE FROM player_stats  WHERE match_id IN ${matchScope}`, [teamId])
      await client.query(`DELETE FROM rounds        WHERE match_id IN ${matchScope}`, [teamId])
      await client.query(`DELETE FROM matches       WHERE team_id = $1`, [teamId])
      await client.query(`DELETE FROM players       WHERE team_id = $1`, [teamId])
      await client.query(`DELETE FROM user_teams    WHERE user_id = $1`, [userId])
      await client.query(`DELETE FROM teams         WHERE id = $1`, [teamId])
    })

    // ── Supabase auth ユーザー削除（トランザクション外・DB削除コミット後） ──
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { error: adminErr } = await adminClient.auth.admin.deleteUser(userId)
    if (adminErr) {
      // DB データは既に削除済み（＝利用者保護の主目的は達成）。
      // auth 残存は管理者が監査ログから検知して掃除する。
      logger.error({
        requestId, userId, teamId, errorCode: 'account_delete_auth_user_orphaned',
        message: 'DB data deleted but auth.users deletion failed', error: adminErr,
      })
    }

    logger.audit({
      requestId, userId, teamId,
      action: 'account_deleted',
      resource: 'team', resourceId: teamId,
      metadata: { auth_user_deleted: !adminErr },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error({ requestId, errorCode: 'account_delete_failed', error: err })
    console.error('[auth/delete]', err)
    return NextResponse.json({ error: 'アカウント削除に失敗しました' }, { status: 500 })
  }
}
