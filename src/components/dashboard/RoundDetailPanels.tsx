'use client'
import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { tagLabel } from '@/components/round/RoundDetailEditor'
import type { RoundDetailStats, WL } from '@/lib/round-detail'

type TagCount = { id: string; count: number; name: string | null; preset_key: string | null }
export type RoundDetailData = Omit<RoundDetailStats, 'loss_tags'> & { loss_tags: TagCount[] }

const ATK = '#FF8C42'
const DEF = '#00D4A0'

function rateColor(p: number | null) {
  if (p === null) return '#9B9BA4'
  if (p >= 50) return '#00D4A0'
  if (p >= 35) return '#FF8C42'
  return '#FF4655'
}

function WLBar({ e, label, color }: { e: WL; label: string; color: string }) {
  if (!e.total) return null
  const p = Math.round(e.wins / e.total * 100)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium" style={{ color }}>{label}</span>
        <span>
          <span className="font-bold" style={{ color: rateColor(p) }}>{p}%</span>
          <span className="text-muted-foreground/60 ml-1 text-[10px]">{e.wins}W/{e.total - e.wins}L</span>
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${p}%`, background: color }} />
      </div>
    </div>
  )
}

function Empty() {
  const { t } = useLanguage()
  return <p className="text-sm text-muted-foreground">{t('roundDetail.noDetailData')}</p>
}

/** 交戦サイト別勝率（主交戦サイト未入力は設置サイトで代用し、件数を注記） */
export function EngagementSiteWinRates({ data }: { data: RoundDetailData['engagement'] }) {
  const { t } = useLanguage()
  if (!data?.length) return <Empty />
  const substituted = data.reduce((s, d) => s + d.substituted, 0)
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {data.map(d => (
          <div key={d.site} className="bg-muted/20 border border-border/60 rounded-xl p-3 space-y-2">
            <div className="text-xs font-bold text-white">{t(`roundDetail.site_${d.site}`)}</div>
            <WLBar e={d.attack} label={t('roundDetail.attack')} color={ATK} />
            <WLBar e={d.defense} label={t('roundDetail.defense')} color={DEF} />
          </div>
        ))}
      </div>
      {substituted > 0 && (
        <p className="text-[10px] text-muted-foreground">
          ※ {t('roundDetail.substitutedPre')}{substituted}{t('roundDetail.substitutedPost')}
        </p>
      )}
    </div>
  )
}

/** 決着局面別の勝敗（攻撃/防衛） */
export function DecidedPhaseStats({ data }: { data: RoundDetailData['decided_phase'] }) {
  const { t } = useLanguage()
  if (!data?.length) return <Empty />
  return (
    <div className="space-y-3">
      {data.map(d => (
        <div key={d.phase} className="space-y-1.5">
          <div className="text-xs font-semibold text-white">{t(`roundDetail.phase_${d.phase}`)}</div>
          <WLBar e={d.attack} label={t('roundDetail.attack')} color={ATK} />
          <WLBar e={d.defense} label={t('roundDetail.defense')} color={DEF} />
        </div>
      ))}
    </div>
  )
}

/** 人数状況からの勝敗（有利からの敗北一覧・不利からの勝利・設置時の人数別勝率） */
export function PlayerStateStats({ data }: { data: RoundDetailData['player_state'] }) {
  const { t, locale } = useLanguage()
  const [open, setOpen] = useState(false)
  if (!data || (!data.adv_losses.length && !data.disadv_wins && !data.at_plant.length)) return <Empty />
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#FF4655]/5 border border-[#FF4655]/20 rounded-lg p-3 text-center">
          <div className="text-[10px] text-muted-foreground">{t('roundDetail.advLoss')}</div>
          <div className="text-2xl font-bold text-[#FF4655] mt-1">{data.adv_losses.length}</div>
          {data.adv_losses.length > 0 && (
            <button type="button" onClick={() => setOpen(v => !v)} className="text-[10px] text-muted-foreground underline mt-1">
              {open ? t('roundDetail.hideRounds') : t('roundDetail.showRounds')}
            </button>
          )}
        </div>
        <div className="bg-[#00D4A0]/5 border border-[#00D4A0]/20 rounded-lg p-3 text-center">
          <div className="text-[10px] text-muted-foreground">{t('roundDetail.disadvWin')}</div>
          <div className="text-2xl font-bold text-[#00D4A0] mt-1">{data.disadv_wins}</div>
        </div>
      </div>

      {open && (
        <ul className="space-y-1">
          {data.adv_losses.map(r => (
            <li key={`${r.match_id}-${r.round_number}`}>
              <Link href={`/round-analysis?match=${r.match_id}&round=${r.round_number}`}
                className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                <AlertTriangle className="w-3 h-3 text-[#FF8C42] shrink-0" />
                <span className="text-muted-foreground shrink-0">
                  {r.match_date ? new Date(r.match_date).toLocaleDateString(locale === 'en' ? 'en-US' : 'ja-JP') : ''}
                </span>
                <span className="text-white truncate">{r.opponent_name} · {r.map}</span>
                <span className="ml-auto font-mono text-white shrink-0">R{r.round_number}</span>
                {r.state && <span className="font-mono text-[#FF8C42] shrink-0">{r.state}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {data.at_plant.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('roundDetail.atPlantWR')}</div>
          {data.at_plant.map(s => (
            <WLBar key={s.state} e={s} color={s.diff > 0 ? DEF : s.diff < 0 ? '#FF4655' : '#9B9BA4'}
              label={`${s.state}（${t('roundDetail.us')}v${t('roundDetail.them')}）`} />
          ))}
        </div>
      )}
    </div>
  )
}

/** ローテート対応（主交戦サイトと設置サイトが別のラウンド） */
export function RotationStats({ data }: { data: RoundDetailData['rotation'] }) {
  const { t } = useLanguage()
  if (!data || (!data.attack.total && !data.defense.total)) return <Empty />
  return (
    <div className="space-y-3">
      <WLBar e={data.defense} label={t('roundDetail.rotationDef')} color={DEF} />
      <WLBar e={data.attack} label={t('roundDetail.rotationAtk')} color={ATK} />
    </div>
  )
}

/** 敗因タグ集計（負けラウンドのみ、件数順） */
export function LossTagStats({ data }: { data: RoundDetailData['loss_tags'] }) {
  const { t } = useLanguage()
  const rows = (data ?? []).filter(d => d.name)
  if (!rows.length) return <Empty />
  const max = rows[0].count
  return (
    <div className="space-y-2">
      {rows.map(d => (
        <div key={d.id} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-white">{tagLabel({ name: d.name!, preset_key: d.preset_key }, t)}</span>
            <span className="font-bold text-[#FF4655]">{d.count}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#FF4655]/70" style={{ width: `${d.count / max * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
