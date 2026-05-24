import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/server-auth'
import { query } from '@/lib/db'
import { PLANS, BILLING_PERIODS, calcAmount, type Plan } from '@/lib/plans'

function generateReference(): string {
  const now = new Date()
  const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`
  const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `AX${yymm}${rand}`
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan, months = 1 } = await req.json() as { plan: Plan; months: number }
  const planConfig = PLANS.find(p => p.id === plan)
  if (!planConfig || planConfig.price === 0) return NextResponse.json({ error: '無効なプラン' }, { status: 400 })

  const period = BILLING_PERIODS.find(p => p.months === months) ?? BILLING_PERIODS[0]
  const amount = calcAmount(planConfig.price, months)
  const reference = generateReference()

  await query(
    `INSERT INTO payment_orders (team_id, user_id, plan, months, amount, payment_method, reference)
     VALUES ($1, $2, $3, $4, $5, 'bank_transfer', $6)`,
    [auth.teamId, auth.userId, plan, months, amount, reference]
  )

  return NextResponse.json({
    ok: true,
    reference,
    amount,
    plan: planConfig.name,
    months,
    discount: period.discount,
    bank: {
      bankName:      process.env.BANK_NAME      ?? '○○銀行',
      branchName:    process.env.BANK_BRANCH    ?? '○○支店',
      accountType:   '普通',
      accountNumber: process.env.BANK_ACCOUNT_NO   ?? '0000000',
      accountName:   process.env.BANK_ACCOUNT_NAME ?? 'アクセリア',
    },
  })
}
