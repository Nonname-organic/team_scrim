'use client'
import { useRef, useState } from 'react'
import { MAP_IMAGES, MAP_POLYGONS, MAP_ROTATION, normalizeMapKey } from '@/lib/mapPolygons'
import { detectSite } from '@/lib/geometry'
import { useLanguage } from '@/contexts/LanguageContext'

/** 設置位置は丸（ラウンド番号入り）、交戦位置はひし形で区別する */
export type MarkerShape = 'circle' | 'diamond'
export const PLANT_MARKER = { color: '#FF4655', shape: 'circle' as const }
export const ENGAGEMENT_MARKER = { color: '#FFD700', shape: 'diamond' as const }

interface RefMarker { x: number; y: number; color: string; shape: MarkerShape }

function Marker({ x, y, color, shape, size, label, faded }: {
  x: number; y: number; color: string; shape: MarkerShape; size: number; label?: number; faded?: boolean
}) {
  const cx = `${x * 100}%`, cy = `${y * 100}%`
  const opacity = faded ? 0.55 : 0.95
  return (
    <g>
      {shape === 'circle'
        ? <circle cx={cx} cy={cy} r={size} fill={color} fillOpacity={opacity} stroke="white" strokeWidth={1.5} />
        : (
          // ひし形: 中心に置いた正方形を45度回転（% 座標を transform で扱えないため svg を入れ子にする）
          <svg x={cx} y={cy} overflow="visible">
            <rect x={-size} y={-size} width={size * 2} height={size * 2} transform="rotate(45)"
              fill={color} fillOpacity={opacity} stroke="white" strokeWidth={1.5} />
          </svg>
        )}
      {label != null && (
        <text x={cx} y={cy} dy="0.35em" textAnchor="middle" fill={shape === 'diamond' ? '#000' : 'white'}
          fontSize={7} fontWeight="bold" style={{ userSelect: 'none' }}>
          {label}
        </text>
      )}
    </g>
  )
}

/** マップ上をクリックして1点を記録する（プラント位置・交戦位置で共通） */
export function MapPointPicker({
  mapName, roundNumber, x, y, onPick, color, shape, title, hint, others = [],
}: {
  mapName: string
  roundNumber: number
  x: number | null
  y: number | null
  onPick: (x: number, y: number, site: string | null) => void
  color: string
  shape: MarkerShape
  title: string
  hint: string
  /** 参考表示する他の点（例: 交戦位置の入力中に設置位置を薄く表示） */
  others?: RefMarker[]
}) {
  const { t } = useLanguage()
  const outerRef = useRef<HTMLDivElement>(null)
  const [imgError, setImgError] = useState(false)
  const [hoverScreen, setHoverScreen] = useState<{ x: number; y: number } | null>(null)

  const mapKey   = normalizeMapKey(mapName)
  const imageUrl = MAP_IMAGES[mapKey] ? `/api/map-image?key=${mapKey}` : null
  const polygons = MAP_POLYGONS[mapKey] ?? {}
  const rotation = MAP_ROTATION[mapKey] ?? 0

  // 画面座標 → マップ座標（クリック時に使用）
  function screenToMap(sx: number, sy: number) {
    if (!rotation) return { x: sx, y: sy }
    const θ = rotation * Math.PI / 180
    const cx = sx - 0.5, cy = sy - 0.5
    return {
      x: Math.min(1, Math.max(0, cx * Math.cos(θ) + cy * Math.sin(θ) + 0.5)),
      y: Math.min(1, Math.max(0, -cx * Math.sin(θ) + cy * Math.cos(θ) + 0.5)),
    }
  }

  // マップ座標 → 画面座標（ピン表示用: 回転の逆変換）
  function toScreenPos(mx: number, my: number) {
    if (!rotation) return { x: mx, y: my }
    const θ = rotation * Math.PI / 180
    const cx = mx - 0.5, cy = my - 0.5
    return {
      x: cx * Math.cos(θ) - cy * Math.sin(θ) + 0.5,
      y: cx * Math.sin(θ) + cy * Math.cos(θ) + 0.5,
    }
  }

  function getScreenCoords(e: React.MouseEvent<HTMLDivElement>) {
    const rect = outerRef.current?.getBoundingClientRect()
    if (!rect) return null
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    }
  }

  const pinScreen = x !== null && y !== null ? toScreenPos(x, y) : null

  return (
    <div className="flex items-start gap-4 flex-wrap">
      <div
        ref={outerRef}
        onClick={e => {
          const sc = getScreenCoords(e)
          if (!sc) return
          const mp = screenToMap(sc.x, sc.y)
          onPick(mp.x, mp.y, detectSite(mp.x, mp.y, polygons))
        }}
        onMouseMove={e => setHoverScreen(getScreenCoords(e))}
        onMouseLeave={() => setHoverScreen(null)}
        className="relative rounded-xl overflow-hidden border cursor-crosshair bg-muted w-full max-w-[320px] aspect-square"
        style={{ borderColor: `${color}80` }}
      >
        {/* 回転 div: 画像のみ */}
        <div
          className="absolute inset-0"
          style={rotation ? { transform: `rotate(${rotation}deg)`, transformOrigin: 'center center' } : undefined}
        >
          {imageUrl && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={mapName}
              className="w-full h-full object-cover select-none"
              draggable={false}
              onError={() => setImgError(true)} />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">{mapName || 'マップ未選択'}</span>
            </div>
          )}
        </div>

        {/* SVG は回転 div の外 — ピンと十字線が回転しない */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {others.map((o, i) => {
            const s = toScreenPos(o.x, o.y)
            return <Marker key={i} x={s.x} y={s.y} color={o.color} shape={o.shape} size={5} faded />
          })}
          {hoverScreen && (
            <circle cx={`${hoverScreen.x * 100}%`} cy={`${hoverScreen.y * 100}%`}
              r={3} fill={color} fillOpacity={0.9} stroke="white" strokeWidth={0.8} />
          )}
          {pinScreen && (
            <Marker x={pinScreen.x} y={pinScreen.y} color={color} shape={shape} size={7} label={roundNumber} />
          )}
        </svg>

        <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 text-center pointer-events-none">
          <span className="text-[10px] text-white">{hint}</span>
        </div>
      </div>
      <div className="text-xs space-y-1.5 pt-1 min-w-[80px]">
        <p className="text-white font-semibold">{title}</p>
        {x !== null && y !== null ? (
          <p className="text-[#00D4A0] font-medium">{t('roundDetail.set')}</p>
        ) : (
          <p className="text-muted-foreground/60">{t('roundDetail.notSet')}</p>
        )}
      </div>
    </div>
  )
}
