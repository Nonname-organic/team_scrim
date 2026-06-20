'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Users,
  ClipboardEdit, BarChart2, Settings, LogOut, Mail, BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { PlanProvider } from '@/contexts/PlanContext'
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext'

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
      .then(json => {
        if (json?.data) {
          setTeamName(json.data.name)
          setTeamTag(json.data.tag)
        }
      })
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

function Sidebar() {
  const pathname = usePathname()
  const { logout } = useAuth()
  const { locale, setLocale, t } = useLanguage()

  return (
    <aside className="w-56 bg-[#18181F] border-r border-border flex flex-col fixed h-full z-10">
      {/* Logo */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Team Logo"
            className="w-9 h-9 rounded-xl object-cover flex-shrink-0"
          />
          <div className="text-sm font-bold text-white tracking-wider">AXELIA Analytics</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5">
        {NAV_ITEMS.map(({ href, key, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-[#FF4655]/10 text-[#FF4655]'
                : 'text-muted-foreground hover:text-white hover:bg-white/5'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {t(key)}
          </Link>
        ))}
      </nav>

      {/* Team info + language toggle + logout */}
      <div className="px-4 py-3 border-t border-border space-y-2">
        <TeamInfo />

        {/* Language toggle */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground mr-1">Lang</span>
          <button
            onClick={() => setLocale('ja')}
            className={cn(
              'px-2.5 py-1 rounded text-[10px] font-bold border transition-colors',
              locale === 'ja'
                ? 'bg-[#FF4655]/15 border-[#FF4655]/50 text-[#FF4655]'
                : 'border-border text-muted-foreground hover:text-white hover:border-white/30'
            )}
          >
            JA
          </button>
          <button
            onClick={() => setLocale('en')}
            className={cn(
              'px-2.5 py-1 rounded text-[10px] font-bold border transition-colors',
              locale === 'en'
                ? 'bg-[#FF4655]/15 border-[#FF4655]/50 text-[#FF4655]'
                : 'border-border text-muted-foreground hover:text-white hover:border-white/30'
            )}
          >
            EN
          </button>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          {t('nav.logout')}
        </button>
      </div>
    </aside>
  )
}

function DashboardInner({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <main className="flex-1 ml-56 p-6 min-h-screen">
        {children}
      </main>
    </>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PlanProvider>
        <LanguageProvider>
          <div className="flex min-h-screen">
            <DashboardInner>{children}</DashboardInner>
          </div>
        </LanguageProvider>
      </PlanProvider>
    </AuthProvider>
  )
}
