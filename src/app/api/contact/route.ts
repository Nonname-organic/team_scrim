import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const { name, email, category, message } = await req.json()

  if (!name || !email || !category || !message) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'メール設定が未完了です' }, { status: 503 })
  }

  const resend = new Resend(apiKey)

  const { error } = await resend.emails.send({
    from: 'AXELIA Analytics <onboarding@resend.dev>',
    to: 'axelia.esports@gmail.com',
    reply_to: email,
    subject: `[AXELIA Analytics] ${category}: ${name}`,
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
              <td style="padding:8px 0;color:#fff;font-size:13px">${name}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#9B9BA4;font-size:13px">返信先</td>
              <td style="padding:8px 0;font-size:13px">
                <a href="mailto:${email}" style="color:#FF4655">${email}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#9B9BA4;font-size:13px">カテゴリ</td>
              <td style="padding:8px 0;color:#fff;font-size:13px">${category}</td>
            </tr>
          </table>
          <hr style="border:1px solid #2a2a3a;margin:16px 0">
          <p style="color:#ccc;font-size:14px;line-height:1.7;white-space:pre-wrap">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
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
