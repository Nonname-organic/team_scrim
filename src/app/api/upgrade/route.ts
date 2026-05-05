import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getAuthContext } from '@/lib/server-auth'
import { queryOne } from '@/lib/db'
import { PLANS, type Plan } from '@/lib/plans'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-04-22.dahlia',
})

export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan } = await req.json() as { plan: Plan }
  const planConfig = PLANS.find(p => p.id === plan)

  if (!planConfig || !planConfig.stripePriceId) {
    return NextResponse.json({ error: '有効なプランを選択してください' }, { status: 400 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
  }

  try {
    const row = await queryOne<{ stripe_customer_id: string | null }>(
      'SELECT stripe_customer_id FROM user_teams WHERE user_id = $1 AND team_id = $2',
      [auth.userId, auth.teamId]
    )

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: row?.stripe_customer_id ?? undefined,
      line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
      metadata: { user_id: auth.userId, team_id: auth.teamId, plan },
      success_url: `${origin}/pricing?success=1&plan=${plan}`,
      cancel_url:  `${origin}/pricing?cancelled=1`,
      locale: 'ja',
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[upgrade]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
