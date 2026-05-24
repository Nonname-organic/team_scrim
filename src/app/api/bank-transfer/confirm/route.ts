import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'

interface OrderRow {
  id: string; team_id: string; user_id: string; plan: string; months: number
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { reference } = await req.json() as { reference: string }
  const order = await queryOne<OrderRow>(
    `SELECT * FROM payment_orders WHERE reference = $1 AND status = 'pending'`,
    [reference]
  )
  if (!order) return NextResponse.json({ error: '注文が見つかりません' }, { status: 404 })

  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + order.months)

  await query(
    `UPDATE user_teams SET plan = $1, plan_expires_at = $2, stripe_subscription_id = NULL
     WHERE user_id = $3 AND team_id = $4`,
    [order.plan, expiresAt.toISOString(), order.user_id, order.team_id]
  )
  await query(
    `UPDATE payment_orders SET status = 'paid', paid_at = NOW() WHERE id = $1`,
    [order.id]
  )

  return NextResponse.json({ ok: true, plan: order.plan, expiresAt: expiresAt.toISOString() })
}
