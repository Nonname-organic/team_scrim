import { NextRequest, NextResponse } from 'next/server'
import { isRateLimited, rateLimitedResponse, RATE_LIMITS } from './rate-limit'
import { logger, hashRequestMeta, newRequestId } from './logger'
import type { AuthContext } from './server-auth'

// ============================================================
// Write-path rate limiting guard (PR-7)
// ============================================================
// 書き込み系 API（POST/PATCH/DELETE）の冒頭で呼ぶ。
// 1000 回/時/ユーザーを超えると 429 を返し security_logs に記録。
// 正常運用（1チーム1アカウント）では到達しない緩い上限で、
// 自動収集・クローリング等の異常書き込みのみを抑止する。
// 返り値が NextResponse なら即 return、null なら続行。
// ============================================================
export async function guardWrite(
  auth: AuthContext,
  req: NextRequest,
  path: string
): Promise<NextResponse | null> {
  if (await isRateLimited(RATE_LIMITS.apiHourly(auth.userId))) {
    const { ipHash, userAgentHash } = hashRequestMeta(req)
    logger.security({
      eventType: 'rate_limit_exceeded',
      requestId: newRequestId(),
      teamId: auth.teamId,
      userId: auth.userId,
      path,
      ipHash,
      userAgentHash,
      message: 'api hourly write limit exceeded',
    })
    return rateLimitedResponse()
  }
  return null
}
