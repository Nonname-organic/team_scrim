import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { queryOne } from '@/lib/db'
import { query } from '@/lib/db'
import { getPendingPolicies } from '@/lib/consent'
import { logger, hashRequestMeta, newRequestId } from '@/lib/logger'

// ── GET: 未同意ポリシー一覧（/consent ページ用） ──
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pending = await getPendingPolicies(user.id)
  return NextResponse.json({ pendingPolicies: pending })
}

// ── POST: 同意を記録 ──
// body: { policies: [{ type, version }] }
export async function POST(req: NextRequest) {
  const requestId = newRequestId()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ipHash, userAgentHash } = hashRequestMeta(req)

  let policies: { type: string; version: string }[]
  try {
    const body = await req.json()
    policies = Array.isArray(body.policies) ? body.policies : []
  } catch {
    return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
  }
  if (policies.length === 0) {
    return NextResponse.json({ error: '同意対象がありません' }, { status: 400 })
  }

  const teamRow = await queryOne<{ team_id: string }>(
    'SELECT team_id FROM user_teams WHERE user_id = $1 LIMIT 1',
    [user.id]
  ).catch(() => null)

  try {
    // 同意を追記（同一 version の再同意は upsert で consented_at 更新・revoke 解除）
    for (const p of policies) {
      await query(
        `INSERT INTO user_consents (user_id, policy_type, version, ip_hash, user_agent_hash)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, policy_type, version) DO UPDATE SET
           consented_at = NOW(), ip_hash = $4, user_agent_hash = $5, revoked_at = NULL`,
        [user.id, p.type, p.version, ipHash, userAgentHash]
      )
    }

    logger.audit({
      requestId, userId: user.id, teamId: teamRow?.team_id ?? null,
      action: 'consent_granted',
      resource: 'policy',
      metadata: { policies },
    })

    // 記録後の残存未同意を返す（全て同意済みなら空）
    const pending = await getPendingPolicies(user.id)
    return NextResponse.json({ ok: true, pendingPolicies: pending })
  } catch (err) {
    logger.error({ requestId, userId: user.id, errorCode: 'consent_write_failed', error: err })
    return NextResponse.json({ error: '同意の記録に失敗しました' }, { status: 500 })
  }
}
