import { NextResponse } from 'next/server'
import { Pool } from 'pg'

export async function GET() {
  const host = process.env.PGHOST ?? ''
  const isRemote = host.includes('supabase') || host.includes('railway')
  const pool = new Pool({
    ssl: isRemote ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
  })
  try {
    const r = await pool.query('SELECT current_database(), version()')
    await pool.end()
    return NextResponse.json({
      ok: true,
      db: r.rows[0],
      env: { host, port: process.env.PGPORT, user: process.env.PGUSER, db: process.env.PGDATABASE }
    })
  } catch (e) {
    await pool.end().catch(() => {})
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
