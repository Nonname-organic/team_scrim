'use client'
import { useRef, useState, useCallback } from 'react'
import { MAP_IMAGES, MAP_POLYGONS, MAP_ROTATION, normalizeMapKey } from '@/lib/mapPolygons'
import { detectSite } from '@/lib/geometry'
import { X } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export interface PlantRound {
  id: string
  round_number: number
  plant_x: number | null
  plant_y: number | null
  plant_site: string | null
  result: string
  side: string
}

interface Props {
  mapName: string
  rounds: PlantRound[]
  /** round id currently being edited; null = view-only heatmap */
  editRoundId: string | null
  onSaved: (roundId: string, x: number, y: number, site: string | null) => void
  onCancelEdit: () => void
}

/** マップ座標 (map space) → スクリーン座標 (container space) への変換 */
function toScreenPos(x: number, y: number, rotation: number): { sx: number; sy: number } {
  if (!rotation) return { sx: x, sy: y }
  const θ = rotation * Math.PI / 180
  const cx = x - 0.5, cy = y - 0.5
  return {
    sx: cx * Math.cos(θ) - cy * Math.sin(θ) + 0.5,
    sy: cx * Math.sin(θ) + cy * Math.cos(θ) + 0.5,
  }
}

export function MapPlantSelector({ mapName, rounds, editRoundId, onSaved, onCancelEdit }: Props) {
  const { t } = useLanguage()
  const containerRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  const mapKey = normalizeMapKey(mapName)
  const imageUrl = MAP_IMAGES[mapKey] ? `/api/map-image?key=${mapKey}` : null
  const polygons = MAP_POLYGONS[mapKey] ?? {}
  const rotation = MAP_ROTATION[mapKey] ?? 0

  // 画面座標 → マップ座標 (CSSのrotate(θ)の逆変換)
  const screenToMap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return null
    const vx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    const vy = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
    if (!rotation) return { x: vx, y: vy }
    const θ = rotation * Math.PI / 180
    const cx = vx - 0.5, cy = vy - 0.5
    return {
      x: Math.min(1, Math.max(0, cx * Math.cos(θ) + cy * Math.sin(θ) + 0.5)),
      y: Math.min(1, Math.max(0, -cx * Math.sin(θ) + cy * Math.cos(θ) + 0.5)),
    }
  }, [rotation])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!editRoundId) return
    const pos = screenToMap(e)
    if (pos) setMousePos(pos)
  }, [editRoundId, screenToMap])

  const handleMouseLeave = useCallback(() => setMousePos(null), [])

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      if (!editRoundId || saving) return
      const pos = screenToMap(e)
      if (!pos) return

      const { x, y } = pos
      const site = detectSite(x, y, polygons)

      setSaving(true)
      try {
        await fetch(`/api/rounds/${editRoundId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plant_x: x, plant_y: y, plant_site: site }),
        })
        onSaved(editRoundId, x, y, site)
      } finally {
        setSaving(false)
      }
    },
    [editRoundId, saving, polygons, onSaved]
  )

  const placedRounds = rounds.filter(r => r.plant_x !== null && r.plant_y !== null)
  const editingRound = editRoundId ? rounds.find(r => r.id === editRoundId) : null

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t('map.heatmap')}
        </span>
        {editingRound && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#FF4655]">
              R{editingRound.round_number}{t('map.settingPositionSuffix')}
            </span>
            <button
              onClick={onCancelEdit}
              className="text-muted-foreground hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Map container */}
      <div
        ref={containerRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={[
          'relative w-full rounded-xl overflow-hidden border',
          editRoundId ? 'cursor-none border-[#FF4655]/50' : 'cursor-default border-border',
        ].join(' ')}
        style={{ aspectRatio: '1 / 1' }}
      >
        {/* 内側div: 画像のみ回転 */}
        <div
          className="absolute inset-0"
          style={rotation ? { transform: `rotate(${rotation}deg)`, transformOrigin: 'center center' } : undefined}
        >
          {imageUrl && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={mapName}
              className="w-full h-full object-cover select-none"
              draggable={false}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-2">
              <span className="text-muted-foreground text-sm font-medium">{mapName}</span>
              {imgError && (
                <span className="text-muted-foreground/50 text-[10px]">{t('map.imageError')}</span>
              )}
            </div>
          )}
        </div>{/* /内側div */}

        {/* ピン円 + カーソル十字線: 回転divの外 — toScreenPos でスクリーン座標に変換 */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {placedRounds.map(r => {
            const { sx, sy } = toScreenPos(r.plant_x ?? 0, r.plant_y ?? 0, rotation)
            const isEditing = r.id === editRoundId
            const color = r.result === 'win' ? '#00D4A0' : '#FF4655'
            const radius = isEditing ? 5 : 3
            return (
              <g key={r.id} filter={isEditing ? 'url(#glow)' : undefined}>
                {isEditing && (
                  <circle cx={`${sx * 100}%`} cy={`${sy * 100}%`} r={8} fill="none" stroke={color} strokeWidth={1} strokeDasharray="3 2" opacity={0.8} />
                )}
                <circle cx={`${sx * 100}%`} cy={`${sy * 100}%`} r={radius} fill={color} fillOpacity={0.9} stroke="rgba(0,0,0,0.4)" strokeWidth={0.8} />
              </g>
            )
          })}

          {editRoundId && mousePos && (() => {
            const { sx, sy } = toScreenPos(mousePos.x, mousePos.y, rotation)
            return (
              <g>
                <line
                  x1={`${sx * 100}%`} y1="0"
                  x2={`${sx * 100}%`} y2="100%"
                  stroke="#FF4655" strokeWidth="0.6" strokeOpacity="0.5" strokeDasharray="4 4"
                />
                <line
                  x1="0" y1={`${sy * 100}%`}
                  x2="100%" y2={`${sy * 100}%`}
                  stroke="#FF4655" strokeWidth="0.6" strokeOpacity="0.5" strokeDasharray="4 4"
                />
                <circle
                  cx={`${sx * 100}%`} cy={`${sy * 100}%`}
                  r={3} fill="#FF4655" fillOpacity={0.9} stroke="white" strokeWidth={0.8}
                />
              </g>
            )
          })()}
        </svg>

        {/* ラウンド番号ラベル: HTML div で回転しない */}
        {placedRounds.map(r => {
          const { sx, sy } = toScreenPos(r.plant_x ?? 0, r.plant_y ?? 0, rotation)
          const isEditing = r.id === editRoundId
          const color = r.result === 'win' ? '#00D4A0' : '#FF4655'
          const size = isEditing ? 13 : 9
          return (
            <div
              key={r.id}
              className="absolute pointer-events-none select-none leading-none font-bold font-mono"
              style={{
                left: `${sx * 100}%`,
                top:  `${sy * 100}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: size,
                color: 'white',
                textShadow: `0 0 2px ${color}, 0 0 1px rgba(0,0,0,0.8)`,
              }}
            >
              {r.round_number}
            </div>
          )
        })}

        {/* Saving overlay */}
        {saving && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-xs font-medium">{t('map.saving')}</span>
          </div>
        )}

        {/* Edit mode hint */}
        {editRoundId && !saving && (
          <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1.5 text-center pointer-events-none">
            <span className="text-white text-xs">{t('map.clickToSet')}</span>
          </div>
        )}

        {/* No data placeholder */}
        {placedRounds.length === 0 && !editRoundId && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-muted-foreground text-xs bg-black/50 px-3 py-1.5 rounded-lg">
              {t('map.noPositionData')}
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00D4A0] inline-block" />{t('map.winRound')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF4655] inline-block" />{t('map.lossRound')}
        </span>
        <span className="text-muted-foreground/60">{t('map.roundNumberLegend')}</span>
      </div>
    </div>
  )
}
