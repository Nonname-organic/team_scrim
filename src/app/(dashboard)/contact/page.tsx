'use client'

import { useState } from 'react'
import { Send, CheckCircle2, MessageSquare, Bug, Lightbulb, HelpCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

type Category = 'bug' | 'feature' | 'support' | 'other'

const inputCls = 'w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-muted-foreground focus:border-[#FF4655] outline-none transition-colors'

export default function ContactPage() {
  const { t } = useLanguage()
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [category, setCategory] = useState<Category>('support')
  const [message, setMessage]   = useState('')
  const [sent, setSent]         = useState(false)
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const CATEGORIES = [
    { value: 'bug'     as Category, label: t('contact.bugReport'),       icon: Bug,           color: '#FF4655' },
    { value: 'feature' as Category, label: t('contact.featureRequest'),  icon: Lightbulb,     color: '#FFD700' },
    { value: 'support' as Category, label: t('contact.support'),         icon: HelpCircle,    color: '#6C63FF' },
    { value: 'other'   as Category, label: t('contact.other'),           icon: MessageSquare, color: '#9B9BA4' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError(null)
    const cat = CATEGORIES.find(c => c.value === category)?.label ?? category
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, category: cat, message }),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? '送信に失敗しました。時間をおいて再試行してください。')
        return
      }
      setSent(true)
    } catch {
      setError('ネットワークエラーが発生しました。')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#00D4A0]/15 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-[#00D4A0]" />
        </div>
        <h2 className="text-xl font-bold text-white">{t('contact.successTitle')}</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          {t('contact.successDesc')}
        </p>
        <button
          onClick={() => setSent(false)}
          className="mt-2 text-sm text-muted-foreground hover:text-white border border-border hover:border-white/30 rounded-xl px-5 py-2 transition-colors"
        >
          {t('contact.backBtn')}
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('contact.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('contact.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Category */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('contact.category')}
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

        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('contact.name')}
          </label>
          <input
            type="text"
            required
            placeholder={t('contact.namePlaceholder')}
            value={name}
            onChange={e => setName(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('contact.email')}
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

        {/* Message */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('contact.message')}
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

        {error && (
          <div className="text-sm text-[#FF4655] bg-[#FF4655]/10 border border-[#FF4655]/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!name || !email || !message || sending}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#FF4655] hover:bg-[#FF4655]/80 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {sending
            ? <><Loader2 className="w-4 h-4 animate-spin" />{t('contact.sending')}</>
            : <><Send className="w-4 h-4" />{t('contact.send')}</>}
        </button>
      </form>
    </div>
  )
}
