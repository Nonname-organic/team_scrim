'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, ClipboardEdit, BarChart2,
  Settings, LogOut, Mail, BookOpen, MoreHorizontal, X,
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Team Logo" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
          <div className="text-sm font-bold text-white tracking-wider">AXELIA Analytics</div>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="AXELIA" className="w-7 h-7 rounded-lg object-cover" />
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
        'lg:ml-56 lg:p-8',
        // モバイル: トップヘッダー + ボトムナビ分のパディング
        'pt-12 pb-20 px-3 lg:pt-0 lg:pb-0 lg:px-0',
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
