import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getAuthContext } from '@/lib/server-auth'
import { queryOne } from '@/lib/db'
import { PLANS, BILLING_PERIODS, calcAmount, type Plan, type PaymentMethod } from '@/lib/plans'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(key, { apiVersion: '2026-04-22.dahlia' })
}

function stripePaymentMethodTypes(method: PaymentMethod): Stripe.Checkout.SessionCreateParams['payment_method_types'] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (method === 'paypay')  return ['paypay' as any]
  if (method === 'konbini') return ['konbini']
  return ['card']
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { plan: Plan; paymentMethod?: PaymentMethod; months?: number }
  const { plan, paymentMethod = 'card_subscription', months = 1 } = body

  const planConfig = PLANS.find(p => p.id === plan)
  if (!planConfig || planConfig.price === 0) {
    return NextResponse.json({ error: '有効なプランを選択してください' }, { status: 400 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
  }

  try {
    const stripe = getStripe()
    const row = await queryOne<{ stripe_customer_id: string | null }>(
      'SELECT stripe_customer_id FROM user_teams WHERE user_id = $1 AND team_id = $2',
      [auth.userId, auth.teamId]
    )
    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const customer = row?.stripe_customer_id ?? undefined

    // ── Subscription (card monthly) ─────────────────────────────────────────
    if (paymentMethod === 'card_subscription') {
      if (!planConfig.stripePriceId) {
        return NextResponse.json({ error: 'Stripe price ID が未設定です' }, { status: 400 })
      }
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer,
        line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
        metadata: { user_id: auth.userId, team_id: auth.teamId, plan, payment_mode: 'subscription' },
        success_url: `${origin}/pricing?success=1&plan=${plan}`,
        cancel_url:  `${origin}/pricing?cancelled=1`,
        locale: 'ja',
      })
      return NextResponse.json({ url: session.url })
    }

    // ── One-time payment (card / paypay / konbini) ───────────────────────────
    const period = BILLING_PERIODS.find(p => p.months === months) ?? BILLING_PERIODS[0]
    const amount = calcAmount(planConfig.price, months)
    const productName = `${planConfig.name} プラン ${period.label}${period.discount > 0 ? `（${period.discount}%OFF）` : ''}`

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: stripePaymentMethodTypes(paymentMethod),
      customer,
      line_items: [{
        price_data: {
          currency: 'jpy',
          product_data: { name: productName },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      metadata: {
        user_id: auth.userId,
        team_id: auth.teamId,
        plan,
        months:       String(months),
        payment_mode: 'onetime',
      },
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
