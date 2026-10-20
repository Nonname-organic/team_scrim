'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { ja } from '@/lib/translations'
import { tagLabel } from '@/components/round/RoundDetailEditor'
import type { RoundDetailData } from '@/components/dashboard/RoundDetailPanels'
import type { WL } from '@/lib/round-detail'

const ECO_LABELS: Record<string, string> = {
  pistol: 'ピストル', eco: 'エコ', anti_eco: 'アンチエコ', semi_eco: 'セミエコ',
  semi_buy: 'セミバイ', full_buy: 'フルバイ', oper: 'オペ', second: 'セカンド', third: 'サード',
}

// レポートは日本語固定（言語切替の Provider 外のページのため ja 辞書を直接引く）
const t = (key: string): string => {
  const v = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], ja)
  return typeof v === 'string' ? v : key
}
const R = (key: string) => t(`roundDetail.${key}`)

interface Entry { wins: number; total: number; win_rate: number }

const wl = (e: WL | undefined) =>
  e && e.total ? `${Math.round(e.wins / e.total * 100)}% (${e.wins}W/${e.total - e.wins}L)` : '--'

function pct(e: Record<string, unknown> | undefined) {
  if (!e) return '--'
  return `${Math.round(Number(e.win_rate) * 100)}% (${e.wins}W/${e.total}R)`
}

/** 見出し＋表。行が無ければ「データなし」の注記を出す（ダッシュボードの空パネルと同じ扱い） */
function Section({ title, head, rows, empty, children }: {
  title: string; head?: string[]; rows?: ReactNode[][]; empty?: string; children?: ReactNode
}) {
  return (
    <section className="mb-8 avoid-break">
      <h2 className="section-title">{title}</h2>
      {head && rows && (rows.length === 0 ? (
        <p className="text-xs text-gray-400 mt-3">{empty ?? 'データなし'}</p>
      ) : (
        <table className="w-full mt-3 text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100">
              {head.map((h, i) => (
                <th key={h} className={`${i === 0 ? 'text-left' : 'text-right'} px-3 py-2 border border-gray-200`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className={`${ci === 0 ? 'font-medium' : 'text-right'} px-3 py-1.5 border border-gray-200`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ))}
      {children}
    </section>
  )
}

export default function ExportPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    // team_id はサーバー側で認証セッションから解決（自チームのみ出力）
    // ダッシュボードのフィルター（map / match_type / from / to）をそのまま引き継ぐ
    fetch(`/api/export/report${window.location.search}`)
      .then(async r => {
        if (r.status === 429) {
          setErrorMsg('出力回数の上限（10回/時）に達しました。しばらくしてからお試しください。')
          return null
        }
        if (r.status === 401) {
          setErrorMsg('ログインが必要です。')
          return null
        }
        if (!r.ok) { setErrorMsg('データの取得に失敗しました。'); return null }
        return r.json()
      })
      .then(j => { if (j) setData(j.data ?? null); setLoading(false) })
      .catch(() => { setErrorMsg('通信エラーが発生しました。'); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-gray-500 text-sm">読み込み中...</div>
  )
  if (errorMsg) return (
    <div className="flex items-center justify-center h-screen text-gray-500 text-sm">{errorMsg}</div>
  )
  if (!data) return (
    <div className="flex items-center justify-center h-screen text-gray-500 text-sm">データなし</div>
  )

  const s     = data.summary            as Record<string, unknown>
  const trend = (data.trend             as Record<string, unknown>[]) ?? []
  const eco   = (data.economy           as Record<string, unknown>[]) ?? []
  const tim   = (data.timing_win_rates  as Record<string, unknown>[]) ?? []
  const sit   = (data.site_win_rates    as Record<string, Entry>)    ?? {}
  const rnd   = (data.round_win_rates   as Record<string, unknown>[]) ?? []
  const rd    = (data.round_detail      as RoundDetailData | undefined)
  const fbi   = (data.first_blood_impact as Record<string, unknown>[]) ?? []
  const fbRow = fbi.find(r => r.fb_team === true)
  const fdRow = fbi.find(r => r.fb_team === false)
  const fbPct = fbRow ? Math.round(Number(fbRow.win_rate) * 100) : null
  const fdPct = fdRow ? Math.round(Number(fdRow.win_rate) * 100) : null

  const team = s.team as Record<string, unknown> | undefined
  const teamName = String(team?.name ?? 'チーム')
  const recent5 = ((s.recent_matches as Record<string, unknown>[]) ?? []).slice(0, 5)
  const today  = new Date().toLocaleDateString('ja-JP')

  // ダッシュボードと同じ並び・同じ値（直近試合の一覧は除く）
  const kpis = [
    { label: '総合勝率',   value: Math.round(Number(s.overall_win_rate) * 100) },
    { label: 'ATK 勝率',  value: Math.round(Number(s.attack_win_rate)  * 100) },
    { label: 'DEF 勝率',  value: Math.round(Number(s.defense_win_rate) * 100) },
    { label: '直近5試合', value: recent5.length ? Math.round(recent5.filter(m => m.result === 'win').length / recent5.length * 100) : 0 },
  ]

  const timingCfg: Record<string, { label: string; sub: string }> = {
    early: { label: 'Early', sub: 'ラッシュ' },
    mid:   { label: 'Mid',   sub: 'デフォルト' },
    late:  { label: 'Late',  sub: 'スロウ' },
  }
  const timingRows = (['early', 'mid', 'late'] as const).map(k => ({
    k,
    atk: tim.find(r => r.contact_timing === k && r.side === 'attack'),
    def: tim.find(r => r.contact_timing === k && r.side === 'defense'),
  })).filter(r => r.atk || r.def)

  const siteKeys = [
    { atk: 'a_attack', def: 'a_retake', label: 'A サイト' },
    { atk: 'b_attack', def: 'b_retake', label: 'B サイト' },
    { atk: 'c_attack', def: 'c_retake', label: 'C サイト' },
  ].filter(x => sit[x.atk] || sit[x.def])

  const noDetail = R('noDetailData')
  const substituted = rd?.engagement.reduce((n, e) => n + e.substituted, 0) ?? 0
  const ps = rd?.player_state

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Print button — hidden when printing */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="bg-[#FF4655] text-white text-sm font-semibold px-4 py-2 rounded-lg shadow hover:bg-[#e03444] transition-colors"
        >
          PDF保存 / 印刷
        </button>
        <button
          onClick={() => window.close()}
          className="bg-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg shadow hover:bg-gray-300 transition-colors"
        >
          閉じる
        </button>
      </div>

      {/* Report body */}
      <div className="report-body max-w-3xl mx-auto px-8 py-10 text-gray-900 font-sans text-sm leading-relaxed">

        {/* Header */}
        <div className="border-b-2 border-gray-900 pb-4 mb-6">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight">{teamName}</h1>
              <p className="text-gray-500 text-xs mt-0.5">スクリムデータ分析レポート</p>
            </div>
            <div className="text-right text-xs text-gray-400">
              <div>出力日: {today}</div>
            </div>
          </div>
        </div>

        {/* KPI */}
        <Section title="総合成績">
          <div className="grid grid-cols-4 gap-3 mt-3">
            {kpis.map(c => (
              <div key={c.label} className="border border-gray-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-black">{c.value}%</div>
                <div className="text-xs text-gray-500 mt-1">{c.label}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="勝率推移（直近20試合・5試合移動平均）"
          head={['日付', '総合', '攻め', '守り']}
          rows={trend.map(r => [String(r.date), `${r.win_rate}%`, `${r.attack_wr}%`, `${r.defense_wr}%`])} />

        <Section title="購入状況別勝率"
          head={['購入状況', '勝率', '勝/ラウンド']}
          rows={eco.map(r => [
            ECO_LABELS[String(r.economy_type)] ?? String(r.economy_type),
            <b key="p">{Math.round(Number(r.win_rate) * 100)}%</b>,
            `${r.wins}W / ${r.rounds}R`,
          ])} />

        <Section title="ファーストブラッド影響"
          head={['状況', '勝率', 'ラウンド数']}
          rows={fbPct !== null && fdPct !== null ? [
            ['FB取得時（開幕キルを取った）', <b key="p">{fbPct}%</b>, `${fbRow?.rounds}R`],
            ['FD発生時（開幕デスされた）', <b key="p">{fdPct}%</b>, `${fdRow?.rounds}R`],
          ] : []}>
          {fbPct !== null && fdPct !== null && (
            <p className="text-xs text-gray-500 mt-2">
              FB/FD 勝率差: <strong className="text-gray-900">{fbPct - fdPct > 0 ? '+' : ''}{fbPct - fdPct}%</strong>
              （FBを取ったラウンドはFDされたラウンドより {Math.abs(fbPct - fdPct)}% 勝率が{fbPct - fdPct >= 0 ? '高い' : '低い'}）<br />
              {t('dashboard.fbsrNote')}
            </p>
          )}
        </Section>

        <Section title={R('engagementWinRate')} empty={noDetail}
          head={['主交戦サイト', '攻撃', '防衛']}
          rows={(rd?.engagement ?? []).map(e => [R(`site_${e.site}`), wl(e.attack), wl(e.defense)])}>
          {substituted > 0 && (
            <p className="text-xs text-gray-500 mt-2">※ {R('substitutedPre')}{substituted}{R('substitutedPost')}</p>
          )}
        </Section>

        <Section title={t('dashboard.siteWinRate')}
          head={['設置サイト', 'ポストプラント（ATK）', 'リテイク（DEF）']}
          rows={siteKeys.map(({ atk, def, label }) => [
            label,
            pct(sit[atk] as unknown as Record<string, unknown>),
            pct(sit[def] as unknown as Record<string, unknown>),
          ])} />

        <Section title={R('phaseTitle')} empty={noDetail}
          head={[R('decidedPhase'), '攻撃', '防衛']}
          rows={(rd?.decided_phase ?? []).map(p => [R(`phase_${p.phase}`), wl(p.attack), wl(p.defense)])} />

        <Section title={R('playerStateTitle')}>
          {!ps || (!ps.adv_losses.length && !ps.disadv_wins && !ps.at_plant.length) ? (
            <p className="text-xs text-gray-400 mt-3">{noDetail}</p>
          ) : (
            <>
              <table className="w-full mt-3 text-xs border-collapse">
                <tbody>
                  <tr><td className="px-3 py-1.5 border border-gray-200">{R('advLoss')}</td>
                    <td className="px-3 py-1.5 border border-gray-200 text-right font-bold">{ps.adv_losses.length}</td></tr>
                  <tr><td className="px-3 py-1.5 border border-gray-200">{R('disadvWin')}</td>
                    <td className="px-3 py-1.5 border border-gray-200 text-right font-bold">{ps.disadv_wins}</td></tr>
                </tbody>
              </table>
              <div className="mt-5" />
              {ps.adv_losses.length > 0 && (
                <Section title={`${R('advLoss')}（ラウンド一覧）`}
                  head={['日付', '対戦相手', 'マップ', 'ラウンド', '人数状況']}
                  rows={ps.adv_losses.map(r => [
                    r.match_date ? new Date(r.match_date).toLocaleDateString('ja-JP') : '--',
                    r.opponent_name ?? '--', r.map ?? '--', `R${r.round_number}`, r.state ?? '--',
                  ])} />
              )}
              <div className="mt-1" />
              {ps.at_plant.length > 0 && (
                <Section title={`${R('atPlantWR')}（味方v敵）`}
                  head={['人数状況', '勝率']}
                  rows={ps.at_plant.map(a => [a.state, wl(a)])} />
              )}
            </>
          )}
        </Section>

        <Section title={R('rotationTitle')} empty={noDetail}
          head={['状況', '勝率']}
          rows={rd && (rd.rotation.attack.total || rd.rotation.defense.total) ? [
            [R('rotationDef'), wl(rd.rotation.defense)],
            [R('rotationAtk'), wl(rd.rotation.attack)],
          ] : []} />

        <Section title={R('lossTagTitle')} empty={noDetail}
          head={['タグ', '件数']}
          rows={(rd?.loss_tags ?? []).filter(x => x.name).map(x => [
            tagLabel({ name: x.name!, preset_key: x.preset_key }, t), String(x.count),
          ])} />

        <Section title="ラウンド番号別勝率">
          {rnd.length === 0 ? <p className="text-xs text-gray-400 mt-3">データなし</p> : (
            <div className="grid grid-cols-8 gap-1 mt-3 text-[10px]">
              {rnd.map(r => (
                <div key={String(r.round_number)} className="border border-gray-200 rounded px-1 py-1 text-center">
                  <div className="text-gray-500">R{String(r.round_number)}</div>
                  <div className="font-bold text-xs">{Math.round(Number(r.win_rate) * 100)}%</div>
                  <div className="text-gray-400">{String(r.wins)}/{String(r.rounds)}</div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="タイミング別勝率"
          head={['タイミング', 'ATK 勝率', 'DEF 勝率']}
          rows={timingRows.map(({ k, atk, def }) => [
            <span key="l">{timingCfg[k].label}<span className="ml-2 text-gray-400 font-normal">{timingCfg[k].sub}</span></span>,
            pct(atk), pct(def),
          ])} />

        <div className="text-center text-xs text-gray-300 mt-12 border-t border-gray-100 pt-4">
          Generated by スクリムデータ解析 · {today}
        </div>
      </div>

      <style>{`
        .section-title {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #6b7280;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 0.5rem;
        }
        @media print {
          @page { margin: 15mm 12mm; size: A4; }
          body { background: white !important; }
          .report-body { max-width: 100% !important; padding: 0 !important; }
          .avoid-break { break-inside: avoid; }
        }
      `}</style>
    </div>
  )
}
