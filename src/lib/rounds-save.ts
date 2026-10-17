import { sanitizeRoundDetail } from './round-detail'

type Queryable = { query: (sql: string, params?: unknown[]) => Promise<{ rowCount: number | null }> }

/** リクエストの1ラウンド → 列値。キーは固定の列名のみ（SQL に直接埋め込むため） */
function toColumns(r: Record<string, unknown>, tagIds: Set<string>): Record<string, unknown> {
  const planted = Boolean(r.plant ?? false)
  const plantSite = (r.site as string) || null
  return {
    side: r.side || null,
    result: r.result || null,
    economy_type: r.economy || null,
    planted,
    plant_site: plantSite,
    plant_x: r.plant_x ?? null,
    plant_y: r.plant_y ?? null,
    first_blood_team: r.fb_team === '' ? null : r.fb_team,
    contact_timing: r.contact_timing || null,
    notable: r.notable ?? false,
    memo: r.memo || null,
    // 防衛側の planted ＝ 相手に設置され、それに対してリテイクしたラウンド
    retake: r.side === 'defense' && planted,
    ...sanitizeRoundDetail(r, plantSite, tagIds),
  }
}

/**
 * 試合のラウンドを保存する（トランザクション内で呼ぶ）。
 * 全削除→再作成ではなくラウンド番号単位で更新する。送られていない列（vod_start_sec など）と、
 * ラウンドIDに紐づく events / feedbacks を保持するため。送られなかった番号のラウンドは削除。
 */
export async function upsertRounds(
  client: Queryable, matchId: string, rounds: Record<string, unknown>[], tagIds: Set<string>
) {
  const numbers = rounds.map(r => Number(r.round_number))
  await client.query(
    'DELETE FROM rounds WHERE match_id = $1 AND NOT (round_number = ANY($2::int[]))',
    [matchId, numbers]
  )

  for (const r of rounds) {
    const row = toColumns(r, tagIds)
    const cols = Object.keys(row)
    const vals = cols.map(c => row[c])
    const updated = await client.query(
      `UPDATE rounds SET ${cols.map((c, i) => `${c} = $${i + 3}`).join(', ')}
       WHERE match_id = $1 AND round_number = $2`,
      [matchId, r.round_number, ...vals]
    )
    if (updated.rowCount === 0) {
      await client.query(
        `INSERT INTO rounds (match_id, round_number, ${cols.join(', ')})
         VALUES ($1, $2, ${cols.map((_, i) => `$${i + 3}`).join(', ')})`,
        [matchId, r.round_number, ...vals]
      )
    }
  }
}
