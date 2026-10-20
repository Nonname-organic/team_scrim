'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { Noto_Sans_JP } from 'next/font/google'
import { ja } from '@/lib/translations'
import { tagLabel } from '@/components/round/RoundDetailEditor'
import type { RoundDetailData } from '@/components/dashboard/RoundDetailPanels'
import type { WL } from '@/lib/round-detail'

// CSP が外部フォントを許可しないため next/font でビルド時に取り込み、自サイトから配信する
const noto = Noto_Sans_JP({ weight: ['400', '700', '900'], preload: false, display: 'swap' })

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

/** ラウンド番号別の色分け: 50%超=緑 / 30%未満=赤 */
const rateColor = (p: number) => (p > 50 ? 'text-[#16a34a]' : p < 30 ? 'text-[#ef4444]' : 'text-gray-900')

function Title({ children }: { children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-[17px] font-bold text-gray-900 mb-3">
      <span className="inline-block w-[5px] h-[22px] rounded-sm bg-[#FF4655]" />
      {children}
    </h2>
  )
}

/** 見出し＋表。行が無ければ「データなし」の注記を出す（ダッシュボードの空パネルと同じ扱い） */
function Section({ title, head, rows, empty, children }: {
  title: string; head?: string[]; rows?: ReactNode[][]; empty?: string; children?: ReactNode
}) {
  return (
    <section className="mb-7 avoid-break">
      <Title>{title}</Title>
      {head && rows && (rows.length === 0 ? (
        <p className="text-[13px] text-gray-400">{empty ?? 'データなし'}</p>
      ) : (
        <table className="w-full text-[13.5px] border-collapse">
          <thead>
            <tr className="bg-gray-100">
              {head.map((h, i) => (
                <th key={h} className={`${i === 0 ? 'text-left' : 'text-right'} font-bold px-4 py-2 border border-gray-200`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className={`${ci === 0 ? 'font-bold' : 'text-right'} px-4 py-2 border border-gray-200`}>{cell}</td>
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

const Note = ({ children }: { children: ReactNode }) => (
  <p className="text-[12.5px] text-gray-500 mt-2 leading-relaxed">{children}</p>
)

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

  const timingCfg: Record<string, string> = { early: 'Early　ラッシュ', mid: 'Mid　デフォルト', late: 'Late　スロウ' }
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
  const hasPlayerState = !!ps && (ps.adv_losses.length > 0 || ps.disadv_wins > 0 || ps.at_plant.length > 0)

  // 印刷時の各ページ上部（チーム名・日付・ページ番号）。CSS の文字列に入れるため記号を除去
  const cssText = (v: string) => v.replace(/[\\"'<>\n\r]/g, '')
  const pageHeader = `${cssText(teamName)}　スクリムデータ分析レポート`

  return (
    <div className={`${noto.className} min-h-screen bg-white text-gray-900`}>
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
      <div className="report-body max-w-[820px] mx-auto px-10 py-10">

        {/* Header */}
        <header className="flex items-end justify-between pb-4 mb-9 border-b-[3px] border-[#FF4655]">
          <div>
            <h1 className="text-[40px] font-black tracking-tight leading-none">{teamName}</h1>
            <p className="text-gray-500 text-[16px] mt-3">スクリムデータ分析レポート</p>
          </div>
          <div className="text-gray-500 text-[14px]">出力日: {today}</div>
        </header>

        <section className="mb-7 avoid-break">
          <Title>総合成績</Title>
          <div className="grid grid-cols-4 gap-4">
            {kpis.map(c => (
              <div key={c.label} className="border border-gray-200 rounded-xl py-5 text-center">
                <div className="text-[38px] font-black leading-none">{c.value}%</div>
                <div className="text-[13px] text-gray-500 mt-3">{c.label}</div>
              </div>
            ))}
          </div>
        </section>

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
            <Note>
              FB/FD 勝率差: <b className="text-gray-900">{fbPct - fdPct > 0 ? '+' : ''}{fbPct - fdPct}%</b>
              （FBを取ったラウンドはFDされたラウンドより {Math.abs(fbPct - fdPct)}% 勝率が{fbPct - fdPct >= 0 ? '高い' : '低い'}）<br />
              {t('dashboard.fbsrNote')}
            </Note>
          )}
        </Section>

        <Section title={R('engagementWinRate')} empty={noDetail}
          head={['主交戦サイト', '攻撃', '防衛']}
          rows={(rd?.engagement ?? []).map(e => [R(`site_${e.site}`), wl(e.attack), wl(e.defense)])}>
          {substituted > 0 && <Note>※ {R('substitutedPre')}{substituted}{R('substitutedPost')}</Note>}
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

        <section className="mb-7 avoid-break">
          <Title>{R('playerStateTitle')}</Title>
          {!hasPlayerState ? <p className="text-[13px] text-gray-400">{noDetail}</p> : (
            <table className="w-full text-[13.5px] border-collapse">
              <tbody>
                {[[R('advLoss'), ps!.adv_losses.length], [R('disadvWin'), ps!.disadv_wins]].map(([label, n]) => (
                  <tr key={String(label)}>
                    <td className="font-bold px-4 py-3 border border-gray-200">{label}</td>
                    <td className="w-24 text-right text-[17px] font-black px-4 py-3 border border-gray-200">{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {hasPlayerState && ps!.adv_losses.length > 0 && (
          <Section title={`${R('advLoss')}（ラウンド一覧）`}
            head={['日付', '対戦相手', 'マップ', 'ラウンド', '人数状況']}
            rows={ps!.adv_losses.map(r => [
              r.match_date ? new Date(r.match_date).toLocaleDateString('ja-JP') : '--',
              r.opponent_name ?? '--', r.map ?? '--', `R${r.round_number}`, r.state ?? '--',
            ])} />
        )}

        {hasPlayerState && ps!.at_plant.length > 0 && (
          <Section title={`${R('atPlantWR')}（味方 v 敵）`}
            head={['人数状況', '勝率']}
            rows={ps!.at_plant.map(a => [a.state, wl(a)])} />
        )}

        <Section title={R('rotationTitle')} empty={noDetail}
          head={['状況', '勝率']}
          rows={rd && (rd.rotation.attack.total || rd.rotation.defense.total) ? [
            [R('rotationDef'), wl(rd.rotation.defense)],
            [R('rotationAtk'), wl(rd.rotation.attack)],
          ] : []} />

        <Section title={R('lossTagTitle')} empty={noDetail}
          head={['タグ', '件数']}
          rows={(rd?.loss_tags ?? []).filter(x => x.name).map(x => [
            tagLabel({ name: x.name!, preset_key: x.preset_key }, t), <b key="n">{x.count}</b>,
          ])} />

        <section className="mb-7 avoid-break">
          <Title>ラウンド番号別勝率</Title>
          {rnd.length === 0 ? <p className="text-[13px] text-gray-400">データなし</p> : (
            <div className="grid grid-cols-8 gap-2">
              {rnd.map(r => {
                const p = Math.round(Number(r.win_rate) * 100)
                return (
                  <div key={String(r.round_number)} className="border border-gray-200 rounded-lg py-2.5 text-center">
                    <div className="text-[11px] text-gray-500">R{String(r.round_number)}</div>
                    <div className={`text-[20px] font-black leading-tight ${rateColor(p)}`}>{p}%</div>
                    <div className="text-[11px] text-gray-500">{String(r.wins)}/{String(r.rounds)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <Section title="タイミング別勝率"
          head={['タイミング', 'ATK 勝率', 'DEF 勝率']}
          rows={timingRows.map(({ k, atk, def }) => [timingCfg[k], pct(atk), pct(def)])} />

        <div className="text-center text-[13px] text-gray-500 mt-12 border-t border-gray-200 pt-5">
          Generated by スクリムデータ解析 · {today}
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 16mm 12mm 14mm;
            @top-left  { content: "${pageHeader}"; font-size: 9pt; font-weight: 700; color: #374151; }
            @top-right { content: "${cssText(today)}　" counter(page) "/" counter(pages); font-size: 9pt; color: #6b7280; }
          }
          @page :first {
            @top-left  { content: none; }
            @top-right { content: counter(page) "/" counter(pages); font-size: 9pt; color: #6b7280; }
          }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .report-body { max-width: 100% !important; padding: 0 !important; }
          .avoid-break { break-inside: avoid; }
        }
      `}</style>
    </div>
  )
}
