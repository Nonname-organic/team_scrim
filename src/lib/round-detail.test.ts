import { describe, it, expect } from 'vitest'
import {
  computeRoundDetailStats, sanitizeRoundDetail, isRotation, effectiveEngagementSite,
  isAdvantageLoss, isDisadvantageWin, detailWarnings, emptyDetail, type DetailRow,
} from './round-detail'

const TAG_ROTATE = '11111111-1111-4111-8111-111111111111'
const TAG_RETAKE = '22222222-2222-4222-8222-222222222222'

const row = (o: Partial<DetailRow>): DetailRow => ({
  match_id: 'm1', round_number: 1, side: 'defense', result: 'loss',
  plant_site: null, engagement_site: null, engagement_site_source: null, decided_phase: null,
  players_after_engagement_us: null, players_after_engagement_them: null,
  players_at_plant_us: null, players_at_plant_them: null, loss_tags: [],
  ...o,
})

// 受け入れ条件のラウンド: DEF/LOSE、B で 5v2 → A に設置されリテイク失敗
const acceptance = row({
  round_number: 7, side: 'defense', result: 'loss',
  engagement_site: 'B', engagement_site_source: 'input', plant_site: 'A',
  players_after_engagement_us: 5, players_after_engagement_them: 2,
  players_at_plant_us: 5, players_at_plant_them: 2,
  decided_phase: 'POST_PLANT', loss_tags: [TAG_ROTATE, TAG_RETAKE],
})

describe('受け入れ条件のラウンド', () => {
  const s = computeRoundDetailStats([acceptance])

  it('交戦サイト B の防衛に敗北1、A には計上しない', () => {
    expect(s.engagement).toEqual([
      { site: 'B', attack: { wins: 0, total: 0 }, defense: { wins: 0, total: 1 }, substituted: 0 },
    ])
  })
  it('決着局面: 防衛 POST_PLANT に敗北1', () => {
    expect(s.decided_phase).toEqual([
      { phase: 'POST_PLANT', attack: { wins: 0, total: 0 }, defense: { wins: 0, total: 1 } },
    ])
  })
  it('人数有利（3人差以上）からの敗北に1件、ラウンドへ飛べる情報付き', () => {
    expect(s.player_state.adv_losses).toEqual([
      { match_id: 'm1', round_number: 7, map: null, match_date: null, opponent_name: null, state: '5v2' },
    ])
    expect(s.player_state.at_plant).toEqual([{ state: '5v2', diff: 3, wins: 0, total: 1 }])
  })
  it('ローテート: 防衛側の敗北1', () => {
    expect(isRotation(acceptance)).toBe(true)
    expect(s.rotation).toEqual({ attack: { wins: 0, total: 0 }, defense: { wins: 0, total: 1 } })
  })
  it('敗因タグが各1件', () => {
    expect(s.loss_tags).toEqual([{ id: TAG_ROTATE, count: 1 }, { id: TAG_RETAKE, count: 1 }])
  })
})

describe('NULL の除外と fallback', () => {
  it('詳細未入力のラウンドは新パネルに一切計上されない（設置サイトも無い場合）', () => {
    const s = computeRoundDetailStats([row({ result: 'win' }), row({ side: 'attack' })])
    expect(s.engagement).toEqual([])
    expect(s.decided_phase).toEqual([])
    expect(s.player_state).toEqual({ adv_losses: [], disadv_wins: 0, at_plant: [] })
    expect(s.rotation).toEqual({ attack: { wins: 0, total: 0 }, defense: { wins: 0, total: 0 } })
    expect(s.loss_tags).toEqual([])
  })

  it('主交戦サイト未入力 → 設置サイトで代用し、代用件数に数える', () => {
    const s = computeRoundDetailStats([row({ side: 'attack', result: 'win', plant_site: 'A' })])
    expect(s.engagement).toEqual([
      { site: 'A', attack: { wins: 1, total: 1 }, defense: { wins: 0, total: 0 }, substituted: 1 },
    ])
  })

  it('マイグレーションの推定値（inferred）も代用扱い', () => {
    expect(effectiveEngagementSite({ engagement_site: 'B', engagement_site_source: 'inferred', plant_site: 'B' }))
      .toEqual({ site: 'B', substituted: true })
    expect(effectiveEngagementSite({ engagement_site: 'MID', engagement_site_source: 'input', plant_site: null }))
      .toEqual({ site: 'MID', substituted: false })
    expect(effectiveEngagementSite({ engagement_site: null, engagement_site_source: null, plant_site: null })).toBeNull()
  })

  it('勝ちラウンドのタグは敗因タグ集計に入れない', () => {
    const s = computeRoundDetailStats([row({ result: 'win', loss_tags: [TAG_ROTATE] })])
    expect(s.loss_tags).toEqual([])
  })
})

describe('導出値', () => {
  it('ローテートは A/B/C 同士で異なる場合のみ', () => {
    expect(isRotation({ engagement_site: 'B', plant_site: 'B' })).toBe(false)
    expect(isRotation({ engagement_site: 'MID', plant_site: 'A' })).toBe(false)
    expect(isRotation({ engagement_site: 'OUTSIDE', plant_site: 'A' })).toBe(false)
    expect(isRotation({ engagement_site: 'A', plant_site: null })).toBe(false)
    expect(isRotation({ engagement_site: 'C', plant_site: 'A' })).toBe(true)
  })

  it('人数差の閾値: 有利は3人差、不利は2人差', () => {
    expect(isAdvantageLoss(row({ players_after_engagement_us: 4, players_after_engagement_them: 2 }))).toBe(false)
    expect(isAdvantageLoss(row({ players_at_plant_us: 4, players_at_plant_them: 1 }))).toBe(true)
    expect(isAdvantageLoss(row({ result: 'win', players_at_plant_us: 4, players_at_plant_them: 1 }))).toBe(false)
    expect(isDisadvantageWin(row({ result: 'win', players_after_engagement_us: 1, players_after_engagement_them: 3 }))).toBe(true)
    expect(isDisadvantageWin(row({ result: 'win', players_after_engagement_us: 2, players_after_engagement_them: 3 }))).toBe(false)
  })
})

describe('sanitizeRoundDetail', () => {
  it('詳細キーが無い入力は {}（既存値を触らない）', () => {
    expect(sanitizeRoundDetail({ side: 'attack' }, 'A')).toEqual({})
  })

  it('不正値は NULL、人数は 0〜5 の整数のみ、タグは許可 ID のみ', () => {
    const out = sanitizeRoundDetail({
      engagement_site: 'X', decided_phase: 'POST_PLANT',
      players_after_engagement_us: 6, players_after_engagement_them: 2.5,
      players_at_plant_us: '3', players_at_plant_them: 2,
      engagement_x: 0.4, engagement_y: 1.2,
      loss_tags: [TAG_ROTATE, TAG_ROTATE, 'not-a-uuid', TAG_RETAKE],
    }, 'A', new Set([TAG_ROTATE]))
    expect(out).toEqual({
      engagement_site: null, engagement_site_source: null, decided_phase: 'POST_PLANT',
      players_after_engagement_us: null, players_after_engagement_them: null,
      players_at_plant_us: 3, players_at_plant_them: 2,
      engagement_x: null, engagement_y: null,
      loss_tags: [TAG_ROTATE],
    })
  })

  it('設置サイトが無ければ設置時の人数は保存しない', () => {
    const out = sanitizeRoundDetail({ players_at_plant_us: 3, players_at_plant_them: 2 }, null)
    expect(out.players_at_plant_us).toBeNull()
    expect(out.players_at_plant_them).toBeNull()
  })

  it('主交戦サイトを入力したら source は input、推定値は保持', () => {
    expect(sanitizeRoundDetail({ engagement_site: 'B' }, null).engagement_site_source).toBe('input')
    expect(sanitizeRoundDetail({ engagement_site: 'B', engagement_site_source: 'inferred' }, 'B').engagement_site_source).toBe('inferred')
  })
})

describe('detailWarnings', () => {
  it('POST_PLANT / DEFUSE なのに設置サイトが無ければ警告', () => {
    expect(detailWarnings({ ...emptyDetail(), decided_phase: 'DEFUSE' }, '')).toEqual(['needPlantSite'])
    expect(detailWarnings({ ...emptyDetail(), decided_phase: 'DEFUSE' }, 'B')).toEqual([])
    expect(detailWarnings({ ...emptyDetail(), decided_phase: 'PRE_PLANT' }, '')).toEqual([])
  })
})
