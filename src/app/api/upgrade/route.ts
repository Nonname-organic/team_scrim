import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: '決済機能は現在準備中です' }, { status: 503 })
}
