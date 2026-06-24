/**
 * 認証コールバックURL生成ユーティリティ
 *
 * 開発: http://localhost:3000/auth/callback
 * 本番: NEXT_PUBLIC_APP_URL/auth/callback
 *
 * OAuth・Magic Link・メール認証すべてで同一エンドポイントを使用する。
 */
export function getCallbackUrl(): string {
  // クライアントサイド: 現在のオリジンを使用（dev/prod 自動判別）
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`
  }
  // サーバーサイド: 環境変数 or localhost フォールバック
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'
  return `${base}/auth/callback`
}

/**
 * OAuth プロバイダー追加時はここに追加
 * 例: 'google' | 'github' | 'discord'
 */
export type OAuthProvider = 'google' | 'github'
