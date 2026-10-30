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

  // 本番は Supabase Transaction Pooler（port 6543）経由なので、クライアント側の同時接続を増やしても
  // DB 本体の接続数は増えない。ダッシュボードは約16クエリを並列に投げるため、2本だと8回の順番待ちになる。
  const isServerless = process.env.VERCEL === '1'
  const max = isServerless ? 8 : 10
  const connectionTimeoutMillis = isServerless ? 5000 : 10000
  // 画面間の移動（数分以内）で接続を張り直さない（新規接続は TLS + 認証で約0.15秒かかる）
  const idleTimeoutMillis = 120_000

  if (url) {
    return new Pool({ connectionString: url, ssl, max, idleTimeoutMillis, connectionTimeoutMillis })
  }
  return new Pool({ ssl, max, idleTimeoutMillis, connectionTimeoutMillis })
}

// Singleton in dev (hot reload safe)
const pool = globalThis.pgPool ?? createPool()
// 待機中の接続がサーバー側で切られた時の 'error' を握り、プロセスを落とさない（pg が該当接続を破棄する）
if (pool.listenerCount('error') === 0) pool.on('error', err => console.error('[DB] idle client error', err.message))
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
