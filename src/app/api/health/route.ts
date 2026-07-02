import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
  try {
    const res = await pool.query('SELECT NOW() AS now')
    return NextResponse.json({ ok: true, db: 'connected', time: res.rows[0].now })
  } catch (e) {
    return NextResponse.json({ ok: false, db: 'failed', error: String(e) }, { status: 503 })
  }
}
