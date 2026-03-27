// ============================================================
// VALORANT Scrim Analyzer - TypeScript Type Definitions
// ============================================================

export type Role = 'duelist' | 'initiator' | 'controller' | 'sentinel' | 'igl'
export type Side = 'attack' | 'defense'
export type RoundResult = 'win' | 'loss'
export type MatchResult = 'win' | 'loss' | 'draw'
export type MatchType = 'scrim' | 'official' | 'practice'
export type EconomyType = 'pistol' | 'eco' | 'anti_eco' | 'semi_eco' | 'semi_buy' | 'full_buy' | 'oper' | 'second' | 'third'
export type EventType = 'kill' | 'death' | 'assist' | 'plant' | 'defuse' | 'ultimate' | 'ability'
export type WinCondition = 'elimination' | 'defuse' | 'detonate' | 'time'
export type PlantSite = 'A' | 'B' | 'C'
export type ContactTiming = 'early' | 'mid' | 'late'
export type ReportType = 'post_match' | 'weekly' | 'player' | 'tactical'

// ============================================================
// ENTITIES
// ============================================================

export interface Team {
  id: string
  name: string
  tag: string
  logo_url?: string
  region: string
  created_at: string
}

export interface Player {
  id: string
  team_id: string
  ign: string
  real_name?: string
  role: Role
  agent_pool?: string[]
  active: boolean
  created_at: string
  // joined from team
  team?: Team
}

export interface Match {
  id: string
  team_id: string
  opponent_name: string
  match_date: string
  map: string
  match_type: MatchType
  team_score: number
  opponent_score: number
  result: MatchResult
  attack_rounds_won: number
  attack_rounds_played: number
  defense_rounds_won: number
  defense_rounds_played: number
  video_url?: string
  scoreboard_image_url?: string
  notes?: string
  created_at: string
}

export interface Round {
  id: string
  match_id: string
  round_number: number
  side: Side
  result: RoundResult
  win_condition?: WinCondition
  economy_type?: EconomyType
  team_credits_avg?: number
  opp_credits_avg?: number
  planted: boolean
  plant_site?: PlantSite
  plant_time_sec?: number
  team_kills: number
  opp_kills: number
  first_blood_team?: boolean
  contact_timing?: ContactTiming
  created_at: string
}

export interface Event {
  id: string
  match_id: string
  round_id: string
  round_number: number
  event_type: EventType
  timestamp_sec?: number
  killer_player_id?: string
  victim_player_id?: string
  assister_player_id?: string
  weapon?: string
  headshot?: boolean
  wall_bang?: boolean
  location_x?: number
  location_y?: number
  site?: string
  is_firstblood?: boolean
  is_clutch?: boolean
  // joined
  killer?: Player
  victim?: Player
  assister?: Player
}

export interface PlayerStats {
  id: string
  match_id: string
  player_id: string
  agent: string
  kills: number
  deaths: number
  assists: number
  acs: number
  kpr: number
  dpr: number
  apr: number
  first_bloods: number
  first_deaths: number
  fbsr: number
  adr: number
  hs_pct: number
  clutch_attempts: number
  clutch_wins: number
  econ_rating: number
  kd_ratio: number
  rounds_played: number
  // joined
  player?: Player
  match?: Match
}

export interface TeamStats {
  id: string
  match_id: string
  team_id: string
  a_site_attack_wins: number
  a_site_attack_total: number
  b_site_attack_wins: number
  b_site_attack_total: number
  a_site_retake_wins: number
  a_site_retake_total: number
  b_site_retake_wins: number
  b_site_retake_total: number
  post_plant_wins: number
  post_plant_total: number
  pistol_wins: number
  pistol_total: number
  eco_wins: number
  eco_total: number
  full_buy_wins: number
  full_buy_total: number
  anti_eco_wins: number
  anti_eco_total: number
  fb_round_wins: number
  fb_round_total: number
  fd_round_wins: number
  fd_round_total: number
}

// ============================================================
// AI REPORT
// ============================================================

export interface LossReason {
  factor: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  win_rate_impact: number  // e.g. -0.23 means -23% win rate
  evidence: string         // specific data point
  rounds_affected?: number
}

export interface WinPattern {
  pattern: string
  frequency: number
  win_rate: number
  description: string
}

export interface Improvement {
  area: 'attack' | 'defense' | 'economy' | 'individual' | 'utility' | 'communication'
  action: string
  priority: 'immediate' | 'this_week' | 'next_month'
  drill?: string
}

export interface PlayerFeedback {
  player_id: string
  ign: string
  role: Role
  performance_grade: 'S' | 'A' | 'B' | 'C' | 'D'
  strengths: string[]
  weaknesses: string[]
  actions: string[]
  role_fit_score: number  // 0-100
}

export interface AIReport {
  id: string
  team_id: string
  match_id?: string
  report_type: ReportType
  loss_reasons: LossReason[]
  win_patterns: WinPattern[]
  improvements: Improvement[]
  player_feedback: PlayerFeedback[]
  raw_analysis: string
  model_used: string
  created_at: string
}

// ============================================================
// AGGREGATED / COMPUTED
// ============================================================

export interface PlayerCareerStats {
  player_id: string
  ign: string
  role: Role
  team_id: string
  matches_played: number
  avg_kills: number
  avg_deaths: number
  avg_assists: number
  avg_acs: number
  avg_kd: number
  avg_kpr: number
  avg_dpr: number
  avg_adr: number
  avg_hs_pct: number
  total_first_bloods: number
  total_first_deaths: number
  career_fbsr: number
}

export interface TeamWinRates {
  team_id: string
  team_name: string
  map: string
  total_matches: number
  wins: number
  win_rate: number
  attack_win_rate: number
  defense_win_rate: number
}

export interface DashboardSummary {
  team: Team
  recent_matches: Match[]
  overall_win_rate: number
  attack_win_rate: number
  defense_win_rate: number
  map_stats: TeamWinRates[]
  top_performers: PlayerCareerStats[]
  last_ai_report?: AIReport
}

// ============================================================
// API REQUEST / RESPONSE
// ============================================================

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface CreateMatchInput {
  opponent_name: string
  match_date: string
  map: string
  match_type: MatchType
  team_score: number
  opponent_score: number
  attack_rounds_won?: number
  attack_rounds_played?: number
  defense_rounds_won?: number
  defense_rounds_played?: number
  video_url?: string
  notes?: string
}

export interface CreatePlayerStatsInput {
  match_id: string
  player_id: string
  agent: string
  kills: number
  deaths: number
  assists: number
  acs: number
  adr: number
  hs_pct: number
  first_bloods?: number
  first_deaths?: number
}

export interface OCRResult {
  success: boolean
  players: Array<{
    ign: string
    agent: string
    kills: number
    deaths: number
    assists: number
    acs: number
    adr?: number
  }>
  raw_text?: string
  confidence?: number
}

// ============================================================
// CHART DATA
// ============================================================

export interface WinRateTrend {
  date: string
  win_rate: number
  attack_wr: number
  defense_wr: number
  matches: number
}

export interface PlayerRadar {
  subject: string
  value: number
  fullMark: number
}

export interface MapHeatmapData {
  x: number
  y: number
  value: number
  event_type: string
}

export const MAPS = [
  'Abyss', 'Ascent', 'Bind', 'Breeze', 'Fracture',
  'Haven', 'Icebox', 'Lotus', 'Pearl', 'Split', 'Sunset'
] as const

export type ValorantMap = typeof MAPS[number]

// 五十音順（濁音・半濁音はその行に内包）
export const AGENTS = [
  'アイソ', 'アストラ',
  'ウェイレイ', 'ヴァイス', 'ヴァイパー',
  'オーメン',
  'キルジョイ', 'クローブ', 'ケイオー', 'ゲッコー',
  'サイファー', 'ジェット', 'スカイ', 'セージ', 'ソーヴァ',
  'チェンバー', 'テホ', 'デッドロック',
  'ネオン',
  'ハーバー', 'フェイド', 'フェニックス', 'ブリーチ', 'ブリムストーン',
  'ミクス',
  'ヨル',
  'レイズ', 'レイナ',
] as const
