import { query } from './db'

// ============================================================
// Consent resolution (PR-5)
// ============================================================
// 有効な最新ポリシー版のうち、ユーザーが未同意のものを返す。
// テーブル未作成（マイグレーション前）でも例外を握りつぶし空扱いにする
// → 段階導入中でもログインが壊れない（後方互換）。
// ============================================================

export interface PendingPolicy {
  type: string
  version: string
}

/** ユーザーが未同意の（有効な最新）ポリシー一覧を返す */
export async function getPendingPolicies(userId: string): Promise<PendingPolicy[]> {
  try {
    const rows = await query<{ type: string; version: string }>(
      `WITH latest AS (
         SELECT DISTINCT ON (type) type, version
         FROM policy_versions
         WHERE effective_at <= NOW()
         ORDER BY type, effective_at DESC, version DESC
       )
       SELECT l.type, l.version
       FROM latest l
       LEFT JOIN user_consents c
         ON c.user_id = $1
        AND c.policy_type = l.type
        AND c.version = l.version
        AND c.revoked_at IS NULL
       WHERE c.id IS NULL`,
      [userId]
    )
    return rows.map(r => ({ type: r.type, version: r.version }))
  } catch {
    // policy_versions/user_consents 未作成時は同意不要として扱う
    return []
  }
}

/** 未同意ポリシーが1件でもあれば true */
export async function needsConsent(userId: string): Promise<boolean> {
  const pending = await getPendingPolicies(userId)
  return pending.length > 0
}
