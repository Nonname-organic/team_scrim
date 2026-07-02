import { Pool, PoolClient } from 'pg'

// ============================================================
// PostgreSQL Connection Pool
// ============================================================

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined
}

function createPool(): Pool {
  const url  = process.env.DATABASE_URL ?? ''
  const host = process.env.PGHOST ?? ''
  const isRemote =
    url.includes('railway') || url.includes('rlwy') || url.includes('supabase') ||
    host.includes('supabase') || host.includes('railway') || host.includes('rlwy')
  const ssl = isRemote ? { rejectUnauthorized: false } : false

  // サーバーレス（Vercel）では接続を使い捨てにするため小さいプールサイズ。
  // Supabase Transaction Pooler（port 6543）を使う場合も max:2 で十分。
  const isServerless = process.env.VERCEL === '1'
  const max = isServerless ? 2 : 10
  const connectionTimeoutMillis = isServerless ? 5000 : 10000

  if (url) {
    return new Pool({ connectionString: url, ssl, max, idleTimeoutMillis: 30000, connectionTimeoutMillis })
  }
  return new Pool({ ssl, max, idleTimeoutMillis: 30000, connectionTimeoutMillis })
}

// Singleton in dev (hot reload safe)
const pool = globalThis.pgPool ?? createPool()
if (process.env.NODE_ENV !== 'production') globalThis.pgPool = pool

// ============================================================
// Query helpers
// ============================================================

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const start = Date.now()
  const res = await pool.query(text, params)
  const duration = Date.now() - start
  if (process.env.NODE_ENV === 'development') {
    console.log('[DB]', { text: text.slice(0, 80), duration, rows: res.rowCount })
  }
  return res.rows as T[]
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export default pool
