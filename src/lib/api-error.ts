import { NextResponse } from 'next/server'

/** サーバーエラーをログし、クライアントには汎用メッセージを返す */
export function serverError(context: string, err: unknown): NextResponse {
  console.error(`[${context}]`, err)
  return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
}

/** 404 Not Found */
export function notFoundError(message = 'リソースが見つかりません'): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 })
}

/** 403 Forbidden */
export function forbiddenError(): NextResponse {
  return NextResponse.json({ error: 'アクセスが拒否されました' }, { status: 403 })
}
