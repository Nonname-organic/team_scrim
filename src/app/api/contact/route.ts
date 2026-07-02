import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { isRateLimited, rateLimitedResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { hashRequestMeta } from '@/lib/logger'

// メール HTML 埋め込み用のエスケープ（全ユーザー入力に適用）
const esc = (s: unknown): string =>
  String(s ?? '').replace(/[<>&"]/g, c => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string
  ))

export async function POST(req: NextRequest) {
  const { name, email, category, message } = await req.json()

  // ── 入力値検証 ──
  if (!name || !email || !category || !message) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }
  if (
    String(name).length > 100 ||
    String(category).length > 100 ||
    String(message).length > 5000 ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email)) ||
    String(email).length > 254
  ) {
    return NextResponse.json({ error: '入力値が正しくありません' }, { status: 400 })
  }

  // ── レート制限: 1 IP 5回/時（未認証のためスパム抑止） ──
  const { ipHash } = hashRequestMeta(req)
  if (ipHash && (await isRateLimited(RATE_LIMITS.contactHourly(ipHash)))) {
    return rateLimitedResponse()
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'メール設定が未完了です' }, { status: 503 })
  }

  const resend = new Resend(apiKey)

  const to = process.env.CONTACT_EMAIL
  if (!to) {
    return NextResponse.json({ error: 'メール設定が未完了です' }, { status: 503 })
  }

  const { error } = await resend.emails.send({
    from: 'AXELIA Analytics <onboarding@resend.dev>',
    to,
    replyTo: String(email),
    subject: `[AXELIA Analytics] ${esc(category)}: ${esc(name)}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1a1a2e;padding:24px;border-radius:12px 12px 0 0">
          <h2 style="color:#fff;margin:0 0 4px">AXELIA Analytics</h2>
          <p style="color:#9B9BA4;font-size:12px;margin:0">お問い合わせ通知</p>
        </div>
        <div style="padding:24px;background:#0f0f1a;border-radius:0 0 12px 12px;border:1px solid #2a2a3a">
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:8px 0;color:#9B9BA4;font-size:13px;width:80px">名前</td>
              <td style="padding:8px 0;color:#fff;font-size:13px">${esc(name)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#9B9BA4;font-size:13px">返信先</td>
              <td style="padding:8px 0;font-size:13px">
                <a href="mailto:${esc(email)}" style="color:#FF4655">${esc(email)}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#9B9BA4;font-size:13px">カテゴリ</td>
              <td style="padding:8px 0;color:#fff;font-size:13px">${esc(category)}</td>
            </tr>
          </table>
          <hr style="border:1px solid #2a2a3a;margin:16px 0">
          <p style="color:#ccc;font-size:14px;line-height:1.7;white-space:pre-wrap">${esc(message)}</p>
        </div>
      </div>
    `,
  })

  if (error) {
    console.error('[contact]', error)
    return NextResponse.json({ error: '送信に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
