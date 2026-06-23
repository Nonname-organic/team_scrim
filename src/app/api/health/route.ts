import { NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()

  try {
    // DB 疎通確認
    await queryOne('SELECT 1 AS ok', [])
    const dbMs = Date.now() - start

    return NextResponse.json({
      status: 'ok',
      db: 'ok',
      db_ms: dbMs,
      ts: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[health]', err)
    return NextResponse.json({
      status: 'error',
      db: 'unreachable',
      ts: new Date().toISOString(),
    }, { status: 503 })
  }
}
