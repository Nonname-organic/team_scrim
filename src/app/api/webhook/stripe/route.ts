import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { query, queryOne } from '@/lib/db'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(key, { apiVersion: '2026-04-22.dahlia' })
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET ?? '')
  } catch (err) {
    console.error('[stripe webhook] signature failed', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const { user_id, team_id, plan, months, payment_mode } = session.metadata ?? {}
      if (!user_id || !team_id || !plan) break

      if (payment_mode === 'onetime') {
        const numMonths = parseInt(months ?? '1', 10)
        const expiresAt = new Date()
        expiresAt.setMonth(expiresAt.getMonth() + numMonths)
        await query(
          `UPDATE user_teams
           SET plan = $1,
               stripe_customer_id = $2,
               stripe_subscription_id = NULL,
               plan_expires_at = $3
           WHERE user_id = $4 AND team_id = $5`,
          [plan, session.customer, expiresAt.toISOString(), user_id, team_id]
        )
      } else {
        // subscription
        await query(
          `UPDATE user_teams
           SET plan = $1,
               stripe_customer_id = $2,
               stripe_subscription_id = $3,
               plan_expires_at = NULL
           WHERE user_id = $4 AND team_id = $5`,
          [plan, session.customer, session.subscription, user_id, team_id]
        )
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const row = await queryOne<{ user_id: string; team_id: string }>(
        `SELECT user_id, team_id FROM user_teams WHERE stripe_subscription_id = $1`,
        [sub.id]
      )
      if (row) {
        await query(
          `UPDATE user_teams SET plan = 'free', stripe_subscription_id = NULL, plan_expires_at = NULL
           WHERE user_id = $1 AND team_id = $2`,
          [row.user_id, row.team_id]
        )
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const priceId = sub.items.data[0]?.price.id
      const { PLANS } = await import('@/lib/plans')
      const plan = PLANS.find(p => p.stripePriceId === priceId)?.id ?? 'free'
      if (sub.status === 'active') {
        await query(
          `UPDATE user_teams SET plan = $1 WHERE stripe_subscription_id = $2`,
          [plan, sub.id]
        )
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
