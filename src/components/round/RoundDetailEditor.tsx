'use client'
import { useEffect, useState } from 'react'
import { AlertTriangle, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { MapPointPicker, PLANT_MARKER, ENGAGEMENT_MARKER } from '@/components/map/MapPointPicker'
import {
  ENGAGEMENT_SITES, DECIDED_PHASES, PLAYER_COUNTS, detailWarnings,
  type LossTag, type RoundDetailInput,
} from '@/lib/round-detail'

/** チームの敗因タグ（無効化したものも含む。過去ラウンドの表示に必要） */
export function useLossTags() {
  const [tags, setTags] = useState<LossTag[]>([])
  useEffect(() => {
    fetch('/api/loss-tags').then(r => r.json()).then(j => setTags(j.data ?? [])).catch(() => {})
  }, [])
  return tags
}

/** 初期タグは言語に合わせて表示、名前を変えたタグ・独自タグは登録名のまま */
export function tagLabel(tag: Pick<LossTag, 'name' | 'preset_key'>, t: (k: string) => string) {
  return tag.preset_key ? t(`roundDetail.tag_${tag.preset_key}`) : tag.name
}

const chip = (active: boolean, activeCls: string) => cn(
  'px-2 py-1 rounded text-[10px] font-bold border transition-colors min-h-[30px]',
  active ? activeCls : 'bg-transparent border-border text-muted-foreground hover:border-muted-foreground'
)

function CountSelect({ value, onChange, disabled, label }: {
  value: number | ''; onChange: (v: number | '') => void; disabled?: boolean; label: string
}) {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      className="bg-muted border border-border rounded px-1.5 py-1 text-xs text-white focus:border-[#FF4655] outline-none disabled:opacity-40 min-h-[30px]"
    >
      <option value="">–</option>
      {PLAYER_COUNTS.map(n => <option key={n} value={n}>{n}</option>)}
    </select>
  )
}

/**
 * ラウンド行の「詳細」パネル。主交戦サイト・人数状況・決着局面・交戦位置・敗因タグ。
 * plantSite が空のときは設置時の人数を入力できない。
 */
export function RoundDetailEditor({
  value, onChange, plantSite, plantX, plantY, mapName, roundNumber, tags,
}: {
  value: RoundDetailInput
  onChange: (patch: Partial<RoundDetailInput>) => void
  plantSite: string
  plantX: number | null
  plantY: number | null
  mapName: string
  roundNumber: number
  tags: LossTag[]
}) {
  const { t } = useLanguage()
  const [mapOpen, setMapOpen] = useState(false)
  const warnings = detailWarnings(value, plantSite)
  const visibleTags = tags.filter(tag => tag.active || value.loss_tags.includes(tag.id))

  const pair = ({ label, us, them, disabled, onUs, onThem }: {
    label: string; us: number | ''; them: number | ''; disabled?: boolean
    onUs: (v: number | '') => void; onThem: (v: number | '') => void
  }) => (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] text-muted-foreground w-[84px] shrink-0">{label}</span>
      <span className="text-[10px] text-[#00D4A0]">{t('roundDetail.us')}</span>
      <CountSelect value={us} onChange={onUs} disabled={disabled} label={`${label} ${t('roundDetail.us')}`} />
      <span className="text-[10px] text-muted-foreground">v</span>
      <CountSelect value={them} onChange={onThem} disabled={disabled} label={`${label} ${t('roundDetail.them')}`} />
      <span className="text-[10px] text-[#FF4655]">{t('roundDetail.them')}</span>
      {disabled && <span className="text-[10px] text-muted-foreground/60">{t('roundDetail.plantSiteRequired')}</span>}
    </div>
  )

  return (
    <div className="space-y-3 text-xs">
      <p className="text-[10px] text-muted-foreground/70">{t('roundDetail.detailHint')}</p>

      {/* 主交戦サイト */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">{t('roundDetail.engagementSite')}</span>
          <span className="text-[10px] text-muted-foreground/50">— {t('roundDetail.engagementSiteHint')}</span>
          {value.engagement_site_source === 'inferred' && (
            <span className="text-[9px] px-1 rounded bg-muted text-muted-foreground">{t('roundDetail.inferred')}</span>
          )}
        </div>
        <div className="flex gap-1 flex-wrap">
          {ENGAGEMENT_SITES.map(s => (
            <button key={s} type="button"
              onClick={() => onChange(value.engagement_site === s
                ? { engagement_site: '', engagement_site_source: '' }
                : { engagement_site: s, engagement_site_source: 'input' })}
              className={chip(value.engagement_site === s, 'bg-[#FFD700]/15 border-[#FFD700]/40 text-[#FFD700]')}>
              {t(`roundDetail.site_${s}`)}
            </button>
          ))}
        </div>
      </div>

      {/* 人数状況 */}
      <div className="space-y-1.5">
        {pair({
          label: t('roundDetail.playersAfterEngagement'),
          us: value.players_after_engagement_us, them: value.players_after_engagement_them,
          onUs: v => onChange({ players_after_engagement_us: v }),
          onThem: v => onChange({ players_after_engagement_them: v }),
        })}
        {pair({
          label: t('roundDetail.playersAtPlant'), disabled: !plantSite,
          us: plantSite ? value.players_at_plant_us : '', them: plantSite ? value.players_at_plant_them : '',
          onUs: v => onChange({ players_at_plant_us: v }),
          onThem: v => onChange({ players_at_plant_them: v }),
        })}
      </div>

      {/* 決着局面 */}
      <div className="space-y-1">
        <span className="text-[10px] text-muted-foreground">{t('roundDetail.decidedPhase')}</span>
        <div className="flex gap-1 flex-wrap">
          {DECIDED_PHASES.map(p => (
            <button key={p} type="button"
              onClick={() => onChange({ decided_phase: value.decided_phase === p ? '' : p })}
              className={chip(value.decided_phase === p, 'bg-[#6C63FF]/20 border-[#6C63FF]/40 text-[#6C63FF]')}>
              {t(`roundDetail.phase_${p}`)}
            </button>
          ))}
        </div>
        {warnings.includes('needPlantSite') && (
          <p className="flex items-center gap-1 text-[10px] text-[#FF8C42]">
            <AlertTriangle className="w-3 h-3" /> {t('roundDetail.needPlantSite')}
          </p>
        )}
      </div>

      {/* 交戦位置 */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">{t('roundDetail.engagementPosition')}</span>
          <span className={cn('text-[10px]', value.engagement_x !== null ? 'text-[#00D4A0]' : 'text-muted-foreground/60')}>
            {value.engagement_x !== null ? t('roundDetail.set') : t('roundDetail.notSet')}
          </span>
          <button type="button" onClick={() => setMapOpen(v => !v)}
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-white min-h-[26px]">
            <MapPin className="w-3 h-3" /> {mapOpen ? t('roundDetail.closeMap') : t('roundDetail.setOnMap')}
          </button>
          {value.engagement_x !== null && (
            <button type="button" onClick={() => onChange({ engagement_x: null, engagement_y: null })}
              className="text-[10px] text-muted-foreground hover:text-[#FF4655]">
              {t('roundDetail.clear')}
            </button>
          )}
        </div>
        {mapOpen && (
          <MapPointPicker
            mapName={mapName}
            roundNumber={roundNumber}
            x={value.engagement_x}
            y={value.engagement_y}
            {...ENGAGEMENT_MARKER}
            title={`R${roundNumber} ${t('roundDetail.engagementPosition')}`}
            hint={t('roundDetail.clickToSetEngagement')}
            others={plantX !== null && plantY !== null ? [{ x: plantX, y: plantY, ...PLANT_MARKER }] : []}
            onPick={(x, y, site) => onChange({
              engagement_x: x, engagement_y: y,
              // 主交戦サイト未選択なら、クリックした位置のサイトを入れておく
              ...(!value.engagement_site || value.engagement_site_source === 'inferred'
                ? site ? { engagement_site: site as RoundDetailInput['engagement_site'], engagement_site_source: 'input' as const } : {}
                : {}),
            })}
          />
        )}
      </div>

      {/* 敗因タグ */}
      {visibleTags.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">{t('roundDetail.lossTags')}</span>
          <div className="flex gap-1 flex-wrap">
            {visibleTags.map(tag => {
              const on = value.loss_tags.includes(tag.id)
              return (
                <button key={tag.id} type="button"
                  onClick={() => onChange({ loss_tags: on ? value.loss_tags.filter(id => id !== tag.id) : [...value.loss_tags, tag.id] })}
                  className={chip(on, 'bg-[#FF4655]/15 border-[#FF4655]/40 text-[#FF4655]')}>
                  {tagLabel(tag, t)}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
