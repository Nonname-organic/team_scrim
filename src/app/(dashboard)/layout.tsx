'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, Swords, TrendingUp,
  ClipboardEdit, BarChart2, Settings, LogOut, CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { PlanProvider, usePlan } from '@/contexts/PlanContext'
import { UpgradeModal } from '@/components/pricing/UpgradeModal'
import { PlanBadge } from '@/components/pricing/PlanBadge'
import { AIUsageBar } from '@/components/pricing/UsageBar'

const nav = [
  { href: '/',               label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/scrim-input',    label: 'スクリム入力',   icon: ClipboardEdit },
  { href: '/players',        label: '選手スタッツ',   icon: Users },
  { href: '/matches',        label: '試合履歴',       icon: Swords },
  { href: '/round-analysis', label: '試合分析',       icon: BarChart2 },
  { href: '/settings',       label: '設定',           icon: Settings },
]

function TeamInfo() {
  const { teamId } = useAuth()
  const { plan, aiUsageLimit, showUpgrade } = usePlan()
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] text-muted-foreground">チーム</div>
          <div className="text-xs font-semibold text-white mt-0.5">{teamName}</div>
          {teamTag && <div className="text-[10px] text-muted-foreground mt-0.5">[{teamTag}]</div>}
        </div>
        <PlanBadge plan={plan} size="xs" />
      </div>
      {aiUsageLimit !== null && (
        <AIUsageBar />
      )}
      {plan === 'free' && (
        <button
          onClick={() => showUpgrade()}
          className="w-full text-[10px] font-bold text-[#FFD700] bg-[#FFD700]/10 hover:bg-[#FFD700]/20 border border-[#FFD700]/20 rounded-lg py-1.5 transition-colors"
        >
          ⭐ Proにアップグレード
        </button>
      )}
    </div>
  )
}

function Sidebar() {
  const pathname = usePathname()
  const { logout } = useAuth()

  return (
    <aside className="w-56 bg-[#18181F] border-r border-border flex flex-col fixed h-full z-10">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-[#FF4655] flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm text-white leading-none">SCRIM</div>
            <div className="text-[10px] text-muted-foreground">ANALYZER</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => (
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
            {label}
          </Link>
        ))}
        <Link
          href="/pricing"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            pathname === '/pricing'
              ? 'bg-[#FFD700]/10 text-[#FFD700]'
              : 'text-[#FFD700]/70 hover:text-[#FFD700] hover:bg-[#FFD700]/5'
          )}
        >
          <CreditCard className="w-4 h-4 flex-shrink-0" />
          プラン
        </Link>
      </nav>

      {/* Team info + logout */}
      <div className="px-4 py-3 border-t border-border space-y-2">
        <TeamInfo />
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          ログアウト
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
      <UpgradeModal />
    </>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PlanProvider>
        <div className="flex min-h-screen">
          <DashboardInner>{children}</DashboardInner>
        </div>
      </PlanProvider>
    </AuthProvider>
  )
}
