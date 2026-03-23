'use client'
import { useRef, useState, useCallback } from 'react'
import { MAP_IMAGES, MAP_POLYGONS, MAP_ROTATION, normalizeMapKey } from '@/lib/mapPolygons'
import { detectSite } from '@/lib/geometry'
import { X } from 'lucide-react'

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

export function MapPlantSelector({ mapName, rounds, editRoundId, onSaved, onCancelEdit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  const mapKey = normalizeMapKey(mapName)
  const imageUrl = MAP_IMAGES[mapKey] ? `/api/map-image?key=${mapKey}` : null
  const polygons = MAP_POLYGONS[mapKey] ?? {}
  const rotation = MAP_ROTATION[mapKey] ?? 0

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!editRoundId) return
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePos({
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    })
  }, [editRoundId])

  const handleMouseLeave = useCallback(() => setMousePos(null), [])

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      if (!editRoundId || saving) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
      const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
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
          プラント位置ヒートマップ
        </span>
        {editingRound && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#FF4655]">
              R{editingRound.round_number} の位置を設定中
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
        {/* Map image */}
        {imageUrl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={mapName}
            className="w-full h-full object-cover select-none"
            draggable={false}
            onError={() => setImgError(true)}
            style={rotation ? { transform: `rotate(${rotation}deg)` } : undefined}
          />
        ) : (
          <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-2">
            <span className="text-muted-foreground text-sm font-medium">{mapName}</span>
            {imgError && (
              <span className="text-muted-foreground/50 text-[10px]">画像を読み込めません</span>
            )}
          </div>
        )}

        {/* SVG heatmap overlay + custom crosshair cursor */}
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
            const cx = `${(r.plant_x ?? 0) * 100}%`
            const cy = `${(r.plant_y ?? 0) * 100}%`
            const isEditing = r.id === editRoundId
            const color = r.result === 'win' ? '#00D4A0' : '#FF4655'
            const radius = isEditing ? 7 : 5

            return (
              <g key={r.id} filter={isEditing ? 'url(#glow)' : undefined}>
                {isEditing && (
                  <circle cx={cx} cy={cy} r={12} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="3 2" opacity={0.8} />
                )}
                <circle cx={cx} cy={cy} r={radius} fill={color} fillOpacity={0.85} stroke="rgba(0,0,0,0.5)" strokeWidth={1} />
                <text x={cx} y={cy} dy="0.35em" textAnchor="middle" fill="white"
                  fontSize={isEditing ? 8 : 6} fontWeight="bold" fontFamily="monospace">
                  {r.round_number}
                </text>
              </g>
            )
          })}

          {/* Custom crosshair cursor */}
          {editRoundId && mousePos && (
            <g>
              <line
                x1={`${mousePos.x * 100}%`} y1="0"
                x2={`${mousePos.x * 100}%`} y2="100%"
                stroke="#FF4655" strokeWidth="0.8" strokeOpacity="0.6" strokeDasharray="4 4"
              />
              <line
                x1="0" y1={`${mousePos.y * 100}%`}
                x2="100%" y2={`${mousePos.y * 100}%`}
                stroke="#FF4655" strokeWidth="0.8" strokeOpacity="0.6" strokeDasharray="4 4"
              />
              <circle
                cx={`${mousePos.x * 100}%`} cy={`${mousePos.y * 100}%`}
                r={4} fill="#FF4655" fillOpacity={0.9} stroke="white" strokeWidth={1}
              />
            </g>
          )}
        </svg>

        {/* Saving overlay */}
        {saving && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-xs font-medium">保存中...</span>
          </div>
        )}

        {/* Edit mode hint */}
        {editRoundId && !saving && (
          <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1.5 text-center pointer-events-none">
            <span className="text-white text-xs">マップ上をクリックしてプラント位置を設定</span>
          </div>
        )}

        {/* No data placeholder */}
        {placedRounds.length === 0 && !editRoundId && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-muted-foreground text-xs bg-black/50 px-3 py-1.5 rounded-lg">
              位置データなし — 下の表で行をクリックして入力
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00D4A0] inline-block" />勝利ラウンド
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF4655] inline-block" />敗北ラウンド
        </span>
        <span className="text-muted-foreground/60">丸の数字＝ラウンド番号</span>
      </div>
    </div>
  )
}
