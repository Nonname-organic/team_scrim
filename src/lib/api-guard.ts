import { NextRequest, NextResponse } from 'next/server'
import { isRateLimited, rateLimitedResponse, RATE_LIMITS } from './rate-limit'
import type { AuthContext } from './server-auth'

/**
 * 書き込み系 API ルートの共通ガード
 * - 認証済みユーザーの apiHourly レート制限を適用
 * - 制限超過時は 429 レスポンスを返す（null = 通過）
 */
export async function guardWrite(
  auth: AuthContext,
  _req: NextRequest,
  _endpoint: string,
): Promise<NextResponse | null> {
  if (await isRateLimited(RATE_LIMITS.apiHourly(auth.userId))) {
    return rateLimitedResponse()
  }
  return null
}
