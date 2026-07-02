import { createHash, randomUUID } from 'crypto'
import { query } from './db'

// ============================================================
// Structured logging → PostgreSQL (PR-3)
// ============================================================
// - Non-blocking: writes are fire-and-forget (never await in request path).
// - UTC timestamps (DB NOW() is UTC on Supabase).
// - PII forbidden: password / cookie / full token / raw IP / raw SQL.
//   IP & user-agent are stored as SHA-256 hashes only.
// - A DB failure in logging must never break the request (all swallowed).
// ============================================================

const SENSITIVE_KEYS = /pass(word)?|token|secret|cookie|authorization|api[_-]?key|refresh/i

/** context オブジェクトから機微情報を再帰的にマスク */
function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[max_depth]'
  if (value == null) return value
  if (typeof value === 'string') {
    // JWT / Bearer らしき長い文字列は先頭のみ残す
    if (value.length > 256) return value.slice(0, 64) + '…[truncated]'
    return value
  }
  if (typeof value !== 'object') return value
  if (Array.isArray(value)) return value.slice(0, 50).map(v => sanitize(v, depth + 1))
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.test(k)) { out[k] = '[redacted]'; continue }
    out[k] = sanitize(v, depth + 1)
  }
  return out
}

/** SHA-256 hex（IP / UA のハッシュ化用。null 安全） */
export function sha256(input: string | null | undefined): string | null {
  if (!input) return null
  return createHash('sha256').update(input).digest('hex')
}

/** リクエストごとの相関ID */
export function newRequestId(): string {
  return randomUUID()
}

interface BaseFields {
  requestId?: string | null
  teamId?: string | null
  userId?: string | null
  path?: string | null
  method?: string | null
}

interface AppLogFields extends BaseFields {
  level?: 'debug' | 'info' | 'warn'
  statusCode?: number | null
  durationMs?: number | null
  message?: string
  context?: Record<string, unknown>
}

interface ErrorLogFields extends BaseFields {
  level?: 'error' | 'fatal'
  errorCode?: string | null
  message?: string
  error?: unknown
  context?: Record<string, unknown>
}

interface AuditLogFields extends BaseFields {
  action: string
  resource?: string | null
  resourceId?: string | null
  metadata?: Record<string, unknown>
}

interface SecurityLogFields extends BaseFields {
  eventType: string
  ipHash?: string | null
  userAgentHash?: string | null
  message?: string
  context?: Record<string, unknown>
}

/** fire-and-forget: 失敗しても握りつぶす（リクエストをブロックしない） */
function fireAndForget(p: Promise<unknown>): void {
  p.catch(err => {
    // ログ書き込み自体の失敗は stderr のみ（無限ループ防止のため再ログしない）
    console.error('[logger] write failed:', err instanceof Error ? err.message : err)
  })
}

export const logger = {
  app(f: AppLogFields): void {
    fireAndForget(query(
      `INSERT INTO application_logs
         (level, request_id, team_id, user_id, method, path, status_code, duration_ms, message, context)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        f.level ?? 'info', f.requestId ?? null, f.teamId ?? null, f.userId ?? null,
        f.method ?? null, f.path ?? null, f.statusCode ?? null, f.durationMs ?? null,
        f.message ?? null, f.context ? JSON.stringify(sanitize(f.context)) : null,
      ]
    ))
  },

  error(f: ErrorLogFields): void {
    const err = f.error
    const stack = err instanceof Error ? err.stack ?? null : null
    const message = f.message ?? (err instanceof Error ? err.message : String(err ?? ''))
    fireAndForget(query(
      `INSERT INTO error_logs
         (level, request_id, team_id, user_id, method, path, error_code, message, stack_trace, context)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        f.level ?? 'error', f.requestId ?? null, f.teamId ?? null, f.userId ?? null,
        f.method ?? null, f.path ?? null, f.errorCode ?? null, message,
        stack ? stack.slice(0, 8000) : null,
        f.context ? JSON.stringify(sanitize(f.context)) : null,
      ]
    ))
  },

  audit(f: AuditLogFields): void {
    fireAndForget(query(
      `INSERT INTO audit_logs
         (request_id, team_id, user_id, action, resource, resource_id, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        f.requestId ?? null, f.teamId ?? null, f.userId ?? null, f.action,
        f.resource ?? null, f.resourceId ?? null,
        f.metadata ? JSON.stringify(sanitize(f.metadata)) : null,
      ]
    ))
  },

  security(f: SecurityLogFields): void {
    fireAndForget(query(
      `INSERT INTO security_logs
         (event_type, request_id, team_id, user_id, path, ip_hash, user_agent_hash, message, context)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        f.eventType, f.requestId ?? null, f.teamId ?? null, f.userId ?? null,
        f.path ?? null, f.ipHash ?? null, f.userAgentHash ?? null,
        f.message ?? null, f.context ? JSON.stringify(sanitize(f.context)) : null,
      ]
    ))
  },
}

/** Request から IP/UA を取り出して SHA-256 ハッシュ化（生値は保持しない） */
export function hashRequestMeta(req: { headers: { get(name: string): string | null } }): {
  ipHash: string | null
  userAgentHash: string | null
} {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null
  const ua = req.headers.get('user-agent')
  return { ipHash: sha256(ip), userAgentHash: sha256(ua) }
}
