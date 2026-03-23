'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Users, Swords, Bot, TrendingUp, ClipboardEdit, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const TEAM_ID = process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID ?? 'YOUR_TEAM_UUID'

const nav = [
  { href: '/',               label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/scrim-input',    label: 'スクリム入力',   icon: ClipboardEdit },
  { href: '/players',        label: '選手スタッツ',   icon: Users },
  { href: '/matches',        label: '試合履歴',       icon: Swords },
  { href: '/round-analysis', label: 'ラウンド分析',   icon: BarChart2 },
  { href: '/ai-coach',       label: 'AIコーチ',       icon: Bot },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [teamName, setTeamName] = useState<string>('MY TEAM')
  const [teamTag, setTeamTag] = useState<string>('')

  useEffect(() => {
    fetch(`/api/teams?team_id=${TEAM_ID}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json?.data) {
          setTeamName(json.data.name)
          setTeamTag(json.data.tag)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div className="flex min-h-screen">
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
        </nav>

        <div className="px-4 py-3 border-t border-border">
          <div className="text-[10px] text-muted-foreground">チーム</div>
          <div className="text-xs font-semibold text-white mt-0.5">{teamName}</div>
          {teamTag && <div className="text-[10px] text-muted-foreground mt-0.5">[{teamTag}]</div>}
        </div>
      </aside>

      <main className="flex-1 ml-56 p-6 min-h-screen">
        {children}
      </main>
    </div>
  )
}
