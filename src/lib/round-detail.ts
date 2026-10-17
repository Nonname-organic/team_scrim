// ============================================================
// ラウンド詳細（主交戦サイト・決着局面・人数状況・交戦位置・敗因タグ）
// DB/React に依存しない純粋関数のみ — 入力の検証・導出値・ダッシュボード集計
// ============================================================

export const ENGAGEMENT_SITES = ['A', 'B', 'C', 'MID', 'OUTSIDE', 'NONE'] as const
export const DECIDED_PHASES = ['PRE_PLANT', 'POST_PLANT', 'DEFUSE', 'TIMEOUT', 'SAVE'] as const
export const PLANT_SITES = ['A', 'B', 'C'] as const
export const PLAYER_COUNTS = [0, 1, 2, 3, 4, 5] as const

export type EngagementSite = typeof ENGAGEMENT_SITES[number]
export type DecidedPhase = typeof DECIDED_PHASES[number]

/** 初期タグ（preset_key → 日本語名）。英語名は translations の roundDetail.tag_<key> */
export const PRESET_LOSS_TAGS: { key: string; name: string }[] = [
  { key: 'rotation_late',  name: 'ローテ対応遅れ' },
  { key: 'lurk',           name: 'ラーク被弾' },
  { key: 'no_trade',       name: 'トレード不足' },
  { key: 'retake_fail',    name: 'リテイク失敗' },
  { key: 'no_info',        name: '情報不足' },
  { key: 'eco_loss',       name: 'エコ負け' },
  { key: 'pre_plant_loss', name: '設置前の撃ち合い負け' },
  { key: 'late_defuse',    name: '解除遅れ' },
]

export interface LossTag {
  id: string
  name: string
  preset_key: string | null
  sort_order: number
  active: boolean
}

/** 入力フォームの状態（未入力は '' / null） */
export interface RoundDetailInput {
  engagement_site: EngagementSite | ''
  engagement_site_source: 'input' | 'inferred' | ''
  decided_phase: DecidedPhase | ''
  players_after_engagement_us: number | ''
  players_after_engagement_them: number | ''
  players_at_plant_us: number | ''
  players_at_plant_them: number | ''
  engagement_x: number | null
  engagement_y: number | null
  loss_tags: string[]
}

export const DETAIL_KEYS = [
  'engagement_site', 'engagement_site_source', 'decided_phase',
  'players_after_engagement_us', 'players_after_engagement_them',
  'players_at_plant_us', 'players_at_plant_them',
  'engagement_x', 'engagement_y', 'loss_tags',
] as const

export const emptyDetail = (): RoundDetailInput => ({
  engagement_site: '', engagement_site_source: '', decided_phase: '',
  players_after_engagement_us: '', players_after_engagement_them: '',
  players_at_plant_us: '', players_at_plant_them: '',
  engagement_x: null, engagement_y: null, loss_tags: [],
})

/** DB の rounds 行 → フォーム状態 */
export function detailFromRow(r: Record<string, unknown>): RoundDetailInput {
  const n = (v: unknown) => (v == null ? '' : Number(v))
  const f = (v: unknown) => (v == null ? null : Number(v))
  return {
    engagement_site: (r.engagement_site as EngagementSite) ?? '',
    engagement_site_source: (r.engagement_site_source as 'input' | 'inferred') ?? '',
    decided_phase: (r.decided_phase as DecidedPhase) ?? '',
    players_after_engagement_us: n(r.players_after_engagement_us),
    players_after_engagement_them: n(r.players_after_engagement_them),
    players_at_plant_us: n(r.players_at_plant_us),
    players_at_plant_them: n(r.players_at_plant_them),
    engagement_x: f(r.engagement_x),
    engagement_y: f(r.engagement_y),
    loss_tags: Array.isArray(r.loss_tags) ? (r.loss_tags as string[]) : [],
  }
}

/** 詳細が1項目でも入っているか（行の「詳細」ボタンの強調表示用） */
export function hasDetail(d: RoundDetailInput): boolean {
  return (d.engagement_site !== '' && d.engagement_site_source !== 'inferred') || d.decided_phase !== ''
    || d.players_after_engagement_us !== '' || d.players_after_engagement_them !== ''
    || d.players_at_plant_us !== '' || d.players_at_plant_them !== ''
    || d.engagement_x !== null || d.loss_tags.length > 0
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | null =>
  allowed.includes(v as T) ? (v as T) : null
const count = (v: unknown): number | null => {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isInteger(n) && n >= 0 && n <= 5 ? n : null
}
const coord = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1 ? v : null

/**
 * API 入力 → DB 列値。詳細キーが1つも無ければ {}（＝既存値を変更しない）。
 * 設置サイトが無いラウンドの「設置時の人数」は保存しない。
 * allowedTagIds を渡すと、それ以外のタグ ID（他チームのもの等）を捨てる。
 */
export function sanitizeRoundDetail(
  r: Record<string, unknown>,
  plantSite: string | null,
  allowedTagIds?: Set<string>
): Record<string, unknown> {
  if (!DETAIL_KEYS.some(k => k in r)) return {}
  const site = pick(r.engagement_site, ENGAGEMENT_SITES)
  const hasPlant = PLANT_SITES.includes(plantSite as typeof PLANT_SITES[number])
  const x = coord(r.engagement_x), y = coord(r.engagement_y)
  const tags = Array.isArray(r.loss_tags)
    ? [...new Set(r.loss_tags.filter((t): t is string =>
        typeof t === 'string' && UUID_RE.test(t) && (!allowedTagIds || allowedTagIds.has(t))))]
    : []
  return {
    engagement_site: site,
    engagement_site_source: site ? (pick(r.engagement_site_source, ['input', 'inferred'] as const) ?? 'input') : null,
    decided_phase: pick(r.decided_phase, DECIDED_PHASES),
    players_after_engagement_us: count(r.players_after_engagement_us),
    players_after_engagement_them: count(r.players_after_engagement_them),
    players_at_plant_us: hasPlant ? count(r.players_at_plant_us) : null,
    players_at_plant_them: hasPlant ? count(r.players_at_plant_them) : null,
    engagement_x: x !== null && y !== null ? x : null,
    engagement_y: x !== null && y !== null ? y : null,
    loss_tags: tags,
  }
}

/** 入力時の警告（保存はブロックしない） */
export function detailWarnings(d: RoundDetailInput, plantSite: string): string[] {
  const w: string[] = []
  if ((d.decided_phase === 'POST_PLANT' || d.decided_phase === 'DEFUSE') && !plantSite) w.push('needPlantSite')
  return w
}

// ── 導出値 ──────────────────────────────────────────────────────

export interface DetailRow {
  match_id: string
  round_number: number
  side: string
  result: string
  plant_site: string | null
  engagement_site: string | null
  engagement_site_source: string | null
  decided_phase: string | null
  players_after_engagement_us: number | null
  players_after_engagement_them: number | null
  players_at_plant_us: number | null
  players_at_plant_them: number | null
  loss_tags: string[] | null
  map?: string
  match_date?: string
  opponent_name?: string
}

const isSite = (s: string | null | undefined): s is 'A' | 'B' | 'C' =>
  s === 'A' || s === 'B' || s === 'C'

/** 主交戦サイトと設置サイトが別の A/B/C ＝ ローテートが発生した（保存しない導出値） */
export function isRotation(r: Pick<DetailRow, 'engagement_site' | 'plant_site'>): boolean {
  return isSite(r.engagement_site) && isSite(r.plant_site) && r.engagement_site !== r.plant_site
}

/** 集計用の主交戦サイト。未入力なら設置サイトで代用（substituted=true、推定値も代用扱い） */
export function effectiveEngagementSite(
  r: Pick<DetailRow, 'engagement_site' | 'engagement_site_source' | 'plant_site'>
): { site: string; substituted: boolean } | null {
  if (r.engagement_site) return { site: r.engagement_site, substituted: r.engagement_site_source === 'inferred' }
  if (isSite(r.plant_site)) return { site: r.plant_site, substituted: true }
  return null
}

type PlayerFields = Pick<DetailRow, 'result' | 'players_after_engagement_us' | 'players_after_engagement_them'
  | 'players_at_plant_us' | 'players_at_plant_them'>

/** 記録された人数状況（交戦後・設置時）の「味方 − 敵」 */
function playerDiffs(r: PlayerFields): number[] {
  const pairs: [number | null, number | null][] = [
    [r.players_after_engagement_us, r.players_after_engagement_them],
    [r.players_at_plant_us, r.players_at_plant_them],
  ]
  return pairs.filter(([a, b]) => a != null && b != null).map(([a, b]) => Number(a) - Number(b))
}

export const ADVANTAGE_DIFF = 3
export const DISADVANTAGE_DIFF = 2

/** 3人差以上の有利状況があったのに負けたラウンド */
export function isAdvantageLoss(r: PlayerFields): boolean {
  const d = playerDiffs(r)
  return r.result === 'loss' && d.length > 0 && Math.max(...d) >= ADVANTAGE_DIFF
}

/** 2人差以上の不利状況から勝ったラウンド */
export function isDisadvantageWin(r: PlayerFields): boolean {
  const d = playerDiffs(r)
  return r.result === 'win' && d.length > 0 && Math.min(...d) <= -DISADVANTAGE_DIFF
}

/** 表示用の人数状況ラベル（交戦後を優先、無ければ設置時） */
export function playerStateLabel(r: PlayerFields): string | null {
  if (r.players_after_engagement_us != null && r.players_after_engagement_them != null)
    return `${r.players_after_engagement_us}v${r.players_after_engagement_them}`
  if (r.players_at_plant_us != null && r.players_at_plant_them != null)
    return `${r.players_at_plant_us}v${r.players_at_plant_them}`
  return null
}

// ── ダッシュボード集計 ──────────────────────────────────────────

export interface WL { wins: number; total: number }
const wl = (): WL => ({ wins: 0, total: 0 })
const add = (e: WL, win: boolean) => { e.total++; if (win) e.wins++ }

export interface RoundDetailStats {
  engagement: { site: string; attack: WL; defense: WL; substituted: number }[]
  decided_phase: { phase: string; attack: WL; defense: WL }[]
  player_state: {
    adv_losses: { match_id: string; round_number: number; map: string | null; match_date: string | null; opponent_name: string | null; state: string | null }[]
    disadv_wins: number
    at_plant: { state: string; diff: number; wins: number; total: number }[]
  }
  rotation: { attack: WL; defense: WL }
  loss_tags: { id: string; count: number }[]
}

/**
 * 新列を使う集計。各パネルは必要な列が入っているラウンドだけを数える
 * （NULL のラウンドはそのパネルから除外され、既存パネルには一切影響しない）。
 */
export function computeRoundDetailStats(rows: DetailRow[]): RoundDetailStats {
  const eng = new Map<string, { attack: WL; defense: WL; substituted: number }>()
  const phase = new Map<string, { attack: WL; defense: WL }>()
  const atPlant = new Map<string, { diff: number; wins: number; total: number }>()
  const rotation = { attack: wl(), defense: wl() }
  const tagCount = new Map<string, number>()
  const advLosses: RoundDetailStats['player_state']['adv_losses'] = []
  let disadvWins = 0

  for (const r of rows) {
    const win = r.result === 'win'
    const side = r.side === 'attack' ? 'attack' : 'defense'

    const e = effectiveEngagementSite(r)
    if (e) {
      const cur = eng.get(e.site) ?? { attack: wl(), defense: wl(), substituted: 0 }
      add(cur[side], win)
      if (e.substituted) cur.substituted++
      eng.set(e.site, cur)
    }

    if (r.decided_phase) {
      const cur = phase.get(r.decided_phase) ?? { attack: wl(), defense: wl() }
      add(cur[side], win)
      phase.set(r.decided_phase, cur)
    }

    if (isAdvantageLoss(r)) {
      advLosses.push({
        match_id: r.match_id, round_number: r.round_number,
        map: r.map ?? null, match_date: r.match_date ?? null, opponent_name: r.opponent_name ?? null,
        state: playerStateLabel(r),
      })
    }
    if (isDisadvantageWin(r)) disadvWins++

    if (r.players_at_plant_us != null && r.players_at_plant_them != null) {
      const key = `${r.players_at_plant_us}v${r.players_at_plant_them}`
      const cur = atPlant.get(key) ?? { diff: r.players_at_plant_us - r.players_at_plant_them, wins: 0, total: 0 }
      cur.total++
      if (win) cur.wins++
      atPlant.set(key, cur)
    }

    if (isRotation(r)) add(rotation[side], win)

    if (!win) for (const t of r.loss_tags ?? []) tagCount.set(t, (tagCount.get(t) ?? 0) + 1)
  }

  return {
    engagement: ENGAGEMENT_SITES.filter(s => eng.has(s)).map(s => ({ site: s, ...eng.get(s)! })),
    decided_phase: DECIDED_PHASES.filter(p => phase.has(p)).map(p => ({ phase: p, ...phase.get(p)! })),
    player_state: {
      adv_losses: advLosses,
      disadv_wins: disadvWins,
      at_plant: [...atPlant.entries()]
        .map(([state, v]) => ({ state, ...v }))
        .sort((a, b) => b.diff - a.diff || a.state.localeCompare(b.state)),
    },
    rotation,
    loss_tags: [...tagCount.entries()].map(([id, c]) => ({ id, count: c })).sort((a, b) => b.count - a.count),
  }
}
