'use client'

import { useState } from 'react'
import { Send, CheckCircle2, MessageSquare, Bug, Lightbulb, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  { value: 'bug',     label: 'バグ報告',     icon: Bug,            color: '#FF4655' },
  { value: 'feature', label: '機能リクエスト', icon: Lightbulb,      color: '#FFD700' },
  { value: 'support', label: 'サポート',      icon: HelpCircle,     color: '#6C63FF' },
  { value: 'other',   label: 'その他',        icon: MessageSquare,  color: '#9B9BA4' },
] as const

type Category = typeof CATEGORIES[number]['value']

const inputCls = 'w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-muted-foreground focus:border-[#FF4655] outline-none transition-colors'

export default function ContactPage() {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [category, setCategory] = useState<Category>('support')
  const [message, setMessage]   = useState('')
  const [sent, setSent]         = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cat = CATEGORIES.find(c => c.value === category)?.label ?? category
    const subject = encodeURIComponent(`[AXELIA Analytics] ${cat}: ${name}`)
    const body = encodeURIComponent(
      `【AXELIA Analytics お問い合わせ】\n\n名前: ${name}\nメール: ${email}\nカテゴリ: ${cat}\n\n${message}\n\n--\nAXELIA Analytics\nhttps://axelia-analytics.vercel.app`
    )
    window.location.href = `mailto:axelia.esports@gmail.com?subject=${subject}&body=${body}`
    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#00D4A0]/15 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-[#00D4A0]" />
        </div>
        <h2 className="text-xl font-bold text-white">メールを送信しました</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          お問い合わせありがとうございます。内容を確認次第ご返信いたします。
        </p>
        <button
          onClick={() => setSent(false)}
          className="mt-2 text-sm text-muted-foreground hover:text-white border border-border hover:border-white/30 rounded-xl px-5 py-2 transition-colors"
        >
          戻る
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">お問い合わせ</h1>
        <p className="text-sm text-muted-foreground mt-1">
          バグ報告・機能リクエスト・ご質問はこちらからどうぞ
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* カテゴリ */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            カテゴリ
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left',
                  category === value
                    ? 'border-opacity-60 text-white'
                    : 'border-border text-muted-foreground hover:text-white hover:border-white/20 bg-card'
                )}
                style={category === value
                  ? { borderColor: color, background: `${color}15`, color }
                  : {}
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color: category === value ? color : undefined }} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 名前 */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            名前
          </label>
          <input
            type="text"
            required
            placeholder="チーム名 / 担当者名"
            value={name}
            onChange={e => setName(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* メールアドレス */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            返信先メールアドレス
          </label>
          <input
            type="email"
            required
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* メッセージ */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            内容
          </label>
          <textarea
            required
            rows={6}
            placeholder={
              category === 'bug'
                ? '発生した状況・手順・エラーメッセージ等を詳しく記載してください'
                : category === 'feature'
                ? 'どんな機能が欲しいか、どのような課題を解決したいかを教えてください'
                : 'お問い合わせ内容を入力してください'
            }
            value={message}
            onChange={e => setMessage(e.target.value)}
            className={cn(inputCls, 'resize-none')}
          />
        </div>

        <button
          type="submit"
          disabled={!name || !email || !message}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#FF4655] hover:bg-[#FF4655]/80 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          メールを開いて送信
        </button>
      </form>

      <p className="text-[11px] text-muted-foreground/60 text-center">
        送信ボタンを押すとメールアプリが起動します
      </p>
    </div>
  )
}
