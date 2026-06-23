import { queryOne } from './db'
import { NextResponse } from 'next/server'

interface RateLimitOptions {
  key: string        // e.g. `user:${userId}:ai_daily`
  limit: number      // max requests in window
  windowMs: number   // window size in milliseconds
}

/**
 * DB ベースのレートリミット（Vercel Serverless 対応）
 * 超過時は true を返す
 */
export async function isRateLimited({ key, limit, windowMs }: RateLimitOptions): Promise<boolean> {
  try {
    const windowStart = new Date(Date.now() - windowMs).toISOString()

    const result = await queryOne<{ count: number; window_start: string }>(
      `INSERT INTO api_rate_limits (key, count, window_start)
       VALUES ($1, 1, NOW())
       ON CONFLICT (key) DO UPDATE SET
         count = CASE
           WHEN api_rate_limits.window_start < $2::TIMESTAMPTZ
           THEN 1
           ELSE api_rate_limits.count + 1
         END,
         window_start = CASE
           WHEN api_rate_limits.window_start < $2::TIMESTAMPTZ
           THEN NOW()
           ELSE api_rate_limits.window_start
         END
       RETURNING count, window_start`,
      [key, windowStart]
    )

    return (result?.count ?? 1) > limit
  } catch {
    // DB 障害時はレートリミットをスキップ（サービス継続を優先）
    return false
  }
}

export function rateLimitedResponse(): NextResponse {
  return NextResponse.json(
    { error: 'リクエスト上限に達しました。しばらくしてから再試行してください。' },
    {
      status: 429,
      headers: { 'Retry-After': '60' },
    }
  )
}

// ── プリセット ───────────────────────────────────────────────

export const RATE_LIMITS = {
  /** AI分析: 50回/月 */
  aiMonthly: (userId: string) => ({
    key: `user:${userId}:ai_monthly:${new Date().toISOString().slice(0, 7)}`,
    limit: 50,
    windowMs: 31 * 24 * 60 * 60 * 1000,
  }),
  /** OCR: 100回/月 */
  ocrMonthly: (userId: string) => ({
    key: `user:${userId}:ocr_monthly:${new Date().toISOString().slice(0, 7)}`,
    limit: 100,
    windowMs: 31 * 24 * 60 * 60 * 1000,
  }),
  /** API 全般: 1000回/時 */
  apiHourly: (userId: string) => ({
    key: `user:${userId}:api_hourly:${new Date().toISOString().slice(0, 13)}`,
    limit: 1000,
    windowMs: 60 * 60 * 1000,
  }),
} as const
