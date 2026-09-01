'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  LayoutDashboard, Users, ClipboardEdit, BarChart2,
  Settings, LogOut, Mail, BookOpen, MoreHorizontal, X, ScrollText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { PlanProvider } from '@/contexts/PlanContext'
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext'

// モバイルボトムナビに表示するメイン5項目
const BOTTOM_NAV = [
  { href: '/',               key: 'nav.dashboard',     icon: LayoutDashboard },
  { href: '/scrim-input',    key: 'nav.matchInput',     icon: ClipboardEdit },
  { href: '/round-analysis', key: 'nav.matchAnalysis',  icon: BarChart2 },
  { href: '/players',        key: 'nav.playerStats',    icon: Users },
]

// サイドバー全項目
const NAV_ITEMS = [
  { href: '/',               key: 'nav.dashboard',     icon: LayoutDashboard },
  { href: '/scrim-input',    key: 'nav.matchInput',    icon: ClipboardEdit },
  { href: '/players',        key: 'nav.playerStats',   icon: Users },
  { href: '/round-analysis', key: 'nav.matchAnalysis', icon: BarChart2 },
  { href: '/settings',       key: 'nav.settings',      icon: Settings },
  { href: '/guide',          key: 'nav.guide',         icon: BookOpen },
  { href: '/contact',        key: 'nav.contact',       icon: Mail },
]

// Discord コミュニティ (AXELIA Community) 招待リンク
// NEXT_PUBLIC_DISCORD_INVITE_URL で上書き可
const DISCORD_INVITE_URL =
  process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || 'https://discord.gg/VqH3PhqS7N'

// Discord ロゴ（lucide-react にブランドアイコンが無いためインライン SVG）
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.792 8.18 1.792 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )
}

// ガイド配下に表示するポリシーリンク（別タブで開く）
const POLICY_NAV = [
  { href: '/terms',          label: '利用規約' },
  { href: '/data-policy',    label: 'データ利用ポリシー' },
  { href: '/privacy',        label: 'プライバシーポリシー' },
  { href: '/security',       label: 'セキュリティポリシー' },
  { href: '/policy/history', label: '改定履歴' },
]

function TeamInfo() {
  const { teamId } = useAuth()
  const [teamName, setTeamName] = useState('MY TEAM')
  const [teamTag, setTeamTag]   = useState('')

  useEffect(() => {
    if (!teamId) return
    fetch('/api/teams')
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.data) { setTeamName(json.data.name); setTeamTag(json.data.tag) } })
      .catch(() => {})
  }, [teamId])

  return (
    <div>
      <div className="text-[10px] text-muted-foreground">チーム</div>
      <div className="text-xs font-semibold text-white mt-0.5">{teamName}</div>
      {teamTag && <div className="text-[10px] text-muted-foreground mt-0.5">[{teamTag}]</div>}
    </div>
  )
}

// ── デスクトップサイドバー (lg以上) ─────────────────────────────
function Sidebar() {
  const pathname = usePathname()
  const { logout } = useAuth()
  const { locale, setLocale, t } = useLanguage()

  return (
    <aside className="hidden lg:flex w-56 bg-[#18181F] border-r border-border flex-col fixed h-full z-10">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Team Logo" width={36} height={36} className="rounded-xl object-cover flex-shrink-0" priority />
          <div className="text-sm font-bold text-white tracking-wider">AXELIA Analytics</div>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, key, icon: Icon }) => (
          <Link key={href} href={href}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname === href ? 'bg-[#FF4655]/10 text-[#FF4655]' : 'text-muted-foreground hover:text-white hover:bg-white/5'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {t(key)}
          </Link>
        ))}

        {/* Discord コミュニティ */}
        <div className="pt-3">
          <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium bg-[#5865F2]/10 text-[#949CF7] hover:bg-[#5865F2]/20 hover:text-white transition-colors"
          >
            <DiscordIcon className="w-4 h-4 flex-shrink-0" />
            {t('nav.discord')}
          </a>
        </div>

        {/* 規程・ポリシー */}
        <div className="pt-3 pb-1">
          <div className="flex items-center gap-1.5 px-3 mb-1">
            <ScrollText className="w-3.5 h-3.5 text-muted-foreground/50" />
            <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">規程</span>
          </div>
          {POLICY_NAV.map(({ href, label }) => (
            <Link key={href} href={href} target="_blank"
              className="flex items-center px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="px-4 py-3 border-t border-border space-y-2">
        <TeamInfo />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground mr-1">Lang</span>
          {(['ja', 'en'] as const).map(l => (
            <button key={l} onClick={() => setLocale(l)}
              className={cn('px-2.5 py-1 rounded text-[10px] font-bold border transition-colors',
                locale === l ? 'bg-[#FF4655]/15 border-[#FF4655]/50 text-[#FF4655]' : 'border-border text-muted-foreground hover:text-white hover:border-white/30'
              )}
            >{l.toUpperCase()}</button>
          ))}
        </div>
        <button onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />{t('nav.logout')}
        </button>
      </div>
    </aside>
  )
}

// ── モバイルトップヘッダー ──────────────────────────────────────
function MobileHeader() {
  const { locale, setLocale } = useLanguage()

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-[#18181F] border-b border-border px-4 py-2 flex items-center justify-between safe-area-top">
      <div className="flex items-center gap-2">
        <Image src="/logo.png" alt="AXELIA" width={28} height={28} className="rounded-lg object-cover" priority />
        <span className="text-sm font-bold text-white">AXELIA</span>
      </div>
      <div className="flex items-center gap-1">
        {(['ja', 'en'] as const).map(l => (
          <button key={l} onClick={() => setLocale(l)}
            className={cn('px-2.5 py-1 rounded text-[10px] font-bold border transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center',
              locale === l ? 'bg-[#FF4655]/15 border-[#FF4655]/50 text-[#FF4655]' : 'border-border text-muted-foreground'
            )}
          >{l.toUpperCase()}</button>
        ))}
      </div>
    </header>
  )
}

// ── モバイルボトムナビ + More ドロワー ───────────────────────────
function MobileBottomNav() {
  const pathname = usePathname()
  const { logout } = useAuth()
  const { t } = useLanguage()
  const [moreOpen, setMoreOpen] = useState(false)

  const moreItems = [
    { href: '/settings', key: 'nav.settings', icon: Settings },
    { href: '/guide',    key: 'nav.guide',    icon: BookOpen },
    { href: '/contact',  key: 'nav.contact',  icon: Mail },
  ]

  const policyItems = POLICY_NAV

  return (
    <>
      {/* More ドロワー */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute bottom-16 left-0 right-0 bg-[#18181F] border-t border-border rounded-t-2xl p-4 space-y-1"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">メニュー</span>
              <button onClick={() => setMoreOpen(false)} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {moreItems.map(({ href, key, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setMoreOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                  pathname === href ? 'bg-[#FF4655]/10 text-[#FF4655]' : 'text-muted-foreground hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className="w-5 h-5" />{t(key)}
              </Link>
            ))}
            {/* Discord コミュニティ */}
            <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#949CF7] hover:text-white hover:bg-[#5865F2]/20 transition-colors"
            >
              <DiscordIcon className="w-5 h-5" />{t('nav.discord')}
            </a>
            {/* 規程 */}
            <div className="pt-2 border-t border-border/50 mt-2">
              <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest px-4 mb-1">規程</p>
              {policyItems.map(({ href, label }) => (
                <Link key={href} href={href} target="_blank" onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
            <button onClick={() => { setMoreOpen(false); logout() }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-5 h-5" />{t('nav.logout')}
            </button>
          </div>
        </div>
      )}

      {/* ボトムナビバー */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#18181F] border-t border-border safe-area-bottom">
        <div className="flex items-stretch">
          {BOTTOM_NAV.map(({ href, key, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors min-h-[56px]',
                  active ? 'text-[#FF4655]' : 'text-muted-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium leading-tight">{t(key)}</span>
              </Link>
            )
          })}
          {/* More ボタン */}
          <button
            onClick={() => setMoreOpen(v => !v)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors min-h-[56px]',
              moreOpen ? 'text-[#FF4655]' : 'text-muted-foreground'
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">もっと</span>
          </button>
        </div>
      </nav>
    </>
  )
}

function DashboardInner({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* デスクトップサイドバー */}
      <Sidebar />

      {/* モバイルヘッダー */}
      <MobileHeader />

      {/* コンテンツ */}
      <main className={cn(
        'flex-1 min-h-screen',
        // デスクトップ: サイドバー分インデント
        'lg:ml-56',
        // モバイル: トップヘッダー + ボトムナビ分のパディング
        'pt-12 pb-20 px-3',
        // デスクトップ: 上下左右に余白
        'lg:px-12 lg:py-10',
        // モバイルでの余分なoverscrollを抑制
        'overscroll-contain',
      )}>
        {children}
      </main>

      {/* モバイルボトムナビ */}
      <MobileBottomNav />
    </>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PlanProvider>
        <LanguageProvider>
          <div className="flex min-h-screen bg-background">
            <DashboardInner>{children}</DashboardInner>
          </div>
        </LanguageProvider>
      </PlanProvider>
    </AuthProvider>
  )
}
