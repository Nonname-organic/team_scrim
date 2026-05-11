'use client'

import { useState, useId } from 'react'
import {
  ChevronDown, ChevronUp, BookOpen, ClipboardEdit, Lightbulb,
  BarChart2, Bot, AlertTriangle, CheckCircle2, Info, Crosshair,
  Shield, Zap, TrendingUp, Target, Users, Flag, HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// Primitive components
// ─────────────────────────────────────────────────────────────────────────────

function GuideSection({
  id, icon: Icon, title, badge, color = '#6C63FF', defaultOpen = false, children,
}: {
  id: string
  icon: React.ElementType
  title: string
  badge?: string
  color?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section id={id} className="rounded-2xl border border-border overflow-hidden bg-card">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/20 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
          <Icon className="w-4.5 h-4.5" style={{ color }} />
        </div>
        <span className="flex-1 text-base font-bold text-white">{title}</span>
        {badge && (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
            {badge}
          </span>
        )}
        {open
          ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && <div className="px-5 pb-6 space-y-5 border-t border-border/60">{children}</div>}
    </section>
  )
}

function StepCard({
  number, title, why, children,
}: {
  number: number
  title: string
  why?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#FF4655]/20 border border-[#FF4655]/40 flex items-center justify-center text-[#FF4655] text-sm font-black mt-0.5">
        {number}
      </div>
      <div className="flex-1 space-y-2">
        <div className="text-sm font-bold text-white">{title}</div>
        {children}
        {why && (
          <div className="flex items-start gap-2 bg-[#6C63FF]/8 border border-[#6C63FF]/20 rounded-lg px-3 py-2">
            <Lightbulb className="w-3.5 h-3.5 text-[#6C63FF] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-[#6C63FF] font-semibold">なぜ必要？ </span>{why}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function TermCard({
  term, reading, short, detail, color = '#9B9BA4', icon: Icon,
}: {
  term: string
  reading?: string
  short: string
  detail: string
  color?: string
  icon?: React.ElementType
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border overflow-hidden transition-all"
      style={{ borderColor: open ? `${color}40` : undefined }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/10 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}20` }}>
          {Icon
            ? <Icon className="w-4 h-4" style={{ color }} />
            : <span className="text-xs font-black" style={{ color }}>{term.slice(0, 2)}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-white">{term}</span>
            {reading && <span className="text-[11px] text-muted-foreground">（{reading}）</span>}
          </div>
          <p className="text-xs text-muted-foreground truncate">{short}</p>
        </div>
        {open
          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-border/40 space-y-2">
          <p className="text-sm text-muted-foreground leading-relaxed">{detail}</p>
        </div>
      )}
    </div>
  )
}

function TipBox({ type = 'info', children }: { type?: 'info' | 'warn' | 'good'; children: React.ReactNode }) {
  const cfg = {
    info: { color: '#3B82F6', Icon: Info,          label: 'ポイント' },
    warn: { color: '#FF8C42', Icon: AlertTriangle,  label: '注意' },
    good: { color: '#00D4A0', Icon: CheckCircle2,   label: 'コツ' },
  }[type]
  return (
    <div className="flex items-start gap-2.5 rounded-xl px-4 py-3"
      style={{ background: `${cfg.color}10`, border: `1px solid ${cfg.color}25` }}>
      <cfg.Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: cfg.color }} />
      <div className="text-xs text-muted-foreground leading-relaxed">
        <span className="font-bold mr-1" style={{ color: cfg.color }}>{cfg.label}:</span>
        {children}
      </div>
    </div>
  )
}

function ExampleBox({ label, items }: { label: string; items: { from: string; arrow: string; to: string }[] }) {
  return (
    <div className="rounded-xl bg-muted/20 border border-border/60 px-4 py-3 space-y-2">
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</div>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-xs flex-wrap">
          <span className="bg-[#FF4655]/15 text-[#FF4655] px-2 py-0.5 rounded font-medium">{item.from}</span>
          <span className="text-muted-foreground">→</span>
          <span className="text-[#9B9BA4] text-[11px]">{item.arrow}</span>
          <span className="text-muted-foreground">→</span>
          <span className="bg-[#00D4A0]/15 text-[#00D4A0] px-2 py-0.5 rounded font-medium">{item.to}</span>
        </div>
      ))}
    </div>
  )
}

// 簡易マップ図解
function MapDiagram({
  label, sites,
}: {
  label: string
  sites: { name: string; color: string; note?: string }[]
}) {
  return (
    <div className="rounded-xl bg-muted/10 border border-border/60 p-4 space-y-2">
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">{label}</div>
      <div className="flex gap-3 flex-wrap">
        {sites.map(s => (
          <div key={s.name} className="flex-1 min-w-24 rounded-lg p-3 text-center space-y-1"
            style={{ background: `${s.color}12`, border: `1px solid ${s.color}30` }}>
            <div className="text-lg font-black" style={{ color: s.color }}>{s.name}</div>
            {s.note && <div className="text-[10px] text-muted-foreground">{s.note}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ラウンドフロー図
function RoundFlow({ steps }: { steps: { icon: string; label: string; sub?: string }[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap py-2">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="text-center bg-muted/30 rounded-lg px-3 py-2 min-w-16">
            <div className="text-lg">{s.icon}</div>
            <div className="text-[10px] font-bold text-white">{s.label}</div>
            {s.sub && <div className="text-[9px] text-muted-foreground">{s.sub}</div>}
          </div>
          {i < steps.length - 1 && <span className="text-muted-foreground text-sm">→</span>}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Table of Contents
// ─────────────────────────────────────────────────────────────────────────────

const TOC = [
  { id: 'intro',     label: 'はじめに',         icon: BookOpen },
  { id: 'input',     label: 'スクリム入力方法',  icon: ClipboardEdit },
  { id: 'terms',     label: '用語解説',          icon: HelpCircle },
  { id: 'analysis',  label: '分析の見方',        icon: BarChart2 },
  { id: 'ai',        label: 'AIフィードバック',   icon: Bot },
  { id: 'mistakes',  label: 'よくあるミス',      icon: AlertTriangle },
]

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function GuidePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-12">

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-[#6C63FF]/15 to-[#FF4655]/10 border border-[#6C63FF]/20 px-6 py-8 text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-[#6C63FF]/20 flex items-center justify-center mx-auto">
          <BookOpen className="w-7 h-7 text-[#6C63FF]" />
        </div>
        <h1 className="text-2xl font-black text-white">完全操作ガイド</h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          VALORANT未経験者・マネージャー向け。<br />
          入力方法から分析の読み方まで、ゼロから解説します。
        </p>
        <div className="flex items-center justify-center gap-4 pt-1">
          {['初心者OK', 'マネージャー向け', 'アナリスト不要'].map(t => (
            <span key={t} className="text-[11px] text-[#6C63FF] bg-[#6C63FF]/10 px-2.5 py-1 rounded-full border border-[#6C63FF]/20">
              ✓ {t}
            </span>
          ))}
        </div>
      </div>

      {/* Table of Contents */}
      <div className="rounded-2xl border border-border bg-card px-5 py-4">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">目次</div>
        <div className="grid grid-cols-2 gap-1.5">
          {TOC.map(({ id, label, icon: Icon }) => (
            <a key={id} href={`#${id}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-muted/30 transition-colors">
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* ① はじめに */}
      <GuideSection id="intro" icon={BookOpen} title="① はじめに" color="#6C63FF" badge="最初に読む" defaultOpen>
        <div className="pt-4 space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white">このシステムで何ができる？</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AXELIA Analytics は、スクリム（練習試合）のデータを記録・分析するツールです。
              試合後にデータを入力するだけで、<span className="text-white font-medium">チームの弱点・強みを数値で把握</span>できます。
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {[
              { icon: '📊', title: 'データで弱点を発見', desc: '「なんとなく守りが弱い」をデータで証明し、優先練習メニューを決められる' },
              { icon: '🤖', title: 'AIが自動で分析', desc: '入力したデータをAIが分析し、プロコーチ視点でフィードバックを生成' },
              { icon: '📈', title: '成長が可視化', desc: '試合を重ねるごとにグラフが更新され、チームの成長が一目でわかる' },
            ].map(item => (
              <div key={item.title} className="flex gap-3 bg-muted/10 rounded-xl px-4 py-3">
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                <div>
                  <div className="text-sm font-bold text-white">{item.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white">なぜ分析が重要なのか？</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              プロチームは全ての試合をデータ化しています。勘や感想ではなく、
              <span className="text-white font-medium">「何ラウンド中何ラウンド勝ったか」</span>という事実ベースで改善するためです。
            </p>
          </div>

          <ExampleBox label="データがあると改善が具体的になる" items={[
            { from: '「守りが弱い気がする」', arrow: 'データで確認', to: '「Aリテイク勝率18%（要改善）」' },
            { from: '「エコが弱い」', arrow: 'データで確認', to: '「エコラウンド勝率11%→フォース基準を作る」' },
          ]} />

          <TipBox type="info">
            データ入力は試合後5〜10分で完了します。習慣化することで、数試合後には改善の方向性が見えてきます。
          </TipBox>
        </div>
      </GuideSection>

      {/* ② スクリム入力方法 */}
      <GuideSection id="input" icon={ClipboardEdit} title="② スクリム入力方法" color="#FF4655">
        <div className="pt-4 space-y-6">

          <p className="text-sm text-muted-foreground leading-relaxed">
            サイドバーの「<span className="text-white font-medium">試合入力</span>」から入力します。
            上から順に入力していくだけでOKです。
          </p>

          {/* 試合情報 */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white border-l-2 border-[#FF4655] pl-3">試合情報の入力</h3>

            <StepCard number={1} title="日付を選択"
              why="後から「先週の試合」「先月との比較」ができるようになります。試合直後に入力するのがおすすめ。">
              <p className="text-sm text-muted-foreground">試合が行われた日付をカレンダーから選びます。</p>
            </StepCard>

            <StepCard number={2} title="対戦相手チーム名を入力"
              why="「あのチームには勝てるが、このチームには負ける」というパターンを記録できます。スクリム相手との相性分析に使えます。">
              <p className="text-sm text-muted-foreground">相手チームの名前を入力します。略称でもOKです。</p>
              <TipBox type="good">同じチームに複数回当たる場合、表記を統一しておくと比較しやすくなります。</TipBox>
            </StepCard>

            <StepCard number={3} title="マップを選択"
              why="マップごとに戦術が全く異なります。「Bindでの勝率が低い」「Havenは得意」など、マップ別の強弱を把握するために必須です。">
              <p className="text-sm text-muted-foreground">プルダウンからプレイしたマップを選びます。</p>
              <MapDiagram label="マップ例（VALORANTの競技マップ）" sites={[
                { name: 'Bind', color: '#FF4655', note: '2サイト' },
                { name: 'Haven', color: '#FFD700', note: '3サイト' },
                { name: 'Ascent', color: '#00D4A0', note: '2サイト' },
                { name: 'Split', color: '#6C63FF', note: '2サイト' },
              ]} />
            </StepCard>

            <StepCard number={4} title="スコアを入力（自チーム / 相手）"
              why="最終スコアから勝率・ラウンド数が自動計算されます。詳細なラウンド分析の基盤になります。">
              <p className="text-sm text-muted-foreground">例: 自チーム <span className="text-[#00D4A0] font-bold">13</span> ー <span className="text-[#FF4655] font-bold">8</span> 相手</p>
            </StepCard>

            <StepCard number={5} title="前半サイドを選択（ATK/DEF）"
              why="前半12ラウンドがATKかDEFかを記録することで「ATK側の勝率が低い」など、サイド別の弱点を発見できます。">
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg bg-[#FF8C42]/15 border border-[#FF8C42]/30 px-3 py-2 text-center">
                  <Crosshair className="w-4 h-4 text-[#FF8C42] mx-auto mb-1" />
                  <div className="text-xs font-bold text-[#FF8C42]">ATK（攻め）</div>
                  <div className="text-[10px] text-muted-foreground">爆弾を持って攻撃</div>
                </div>
                <div className="flex-1 rounded-lg bg-[#00D4A0]/15 border border-[#00D4A0]/30 px-3 py-2 text-center">
                  <Shield className="w-4 h-4 text-[#00D4A0] mx-auto mb-1" />
                  <div className="text-xs font-bold text-[#00D4A0]">DEF（守り）</div>
                  <div className="text-[10px] text-muted-foreground">爆弾を守って防衛</div>
                </div>
              </div>
            </StepCard>
          </div>

          {/* ラウンド入力 */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white border-l-2 border-[#FF4655] pl-3">ラウンド詳細の入力</h3>

            <p className="text-sm text-muted-foreground leading-relaxed">
              スコアを入力すると<span className="text-white font-medium">ラウンド行が自動生成</span>されます。
              各ラウンドについて以下を入力します。
            </p>

            <RoundFlow steps={[
              { icon: '⚔️', label: '戦闘', sub: 'R1開始' },
              { icon: '💀', label: 'FB/FD', sub: '最初の1キル' },
              { icon: '💣', label: 'プラント', sub: 'ATKのみ' },
              { icon: '🏳️', label: '勝敗', sub: 'W or L' },
            ]} />

            <StepCard number={6} title="購入状況（エコノミー）を選択"
              why="「お金がない時（エコ）でも勝てるか」はチームの実力の重要な指標です。フルバイ時だけ強いチームは、エコラウンドで大きく崩れます。">
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {[
                  { label: 'ピストル', desc: 'R1・R13の開始ラウンド', color: '#FFD700' },
                  { label: 'エコ', desc: '武器なし/軽装で戦う節約ラウンド', color: '#FF4655' },
                  { label: 'フルバイ', desc: 'ライフル+全スキル完全購入', color: '#00D4A0' },
                  { label: 'フォース', desc: '資金不足でも無理やり買うラウンド', color: '#FF8C42' },
                ].map(e => (
                  <div key={e.label} className="flex items-center gap-2 bg-muted/20 rounded-lg px-2.5 py-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: e.color }} />
                    <div>
                      <span className="font-bold text-white">{e.label}</span>
                      <p className="text-muted-foreground text-[10px]">{e.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </StepCard>

            <StepCard number={7} title="結果（W / L）を選択"
              why="ラウンドの勝敗が蓄積されることで、どの状況で勝率が高いか・低いかが自動的に分析されます。">
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg bg-[#00D4A0]/15 border border-[#00D4A0]/40 px-3 py-2 text-center text-sm font-black text-[#00D4A0]">W（勝利）</div>
                <div className="flex-1 rounded-lg bg-[#FF4655]/15 border border-[#FF4655]/40 px-3 py-2 text-center text-sm font-black text-[#FF4655]">L（敗北）</div>
              </div>
            </StepCard>

            <StepCard number={8} title="プラント（爆弾設置）を記録"
              why="「爆弾を置いた後の勝率（ポストプラント勝率）」は重要な戦術指標です。爆弾を置けているのに勝てない場合、ポジション取りや情報共有に問題があります。">
              <div className="rounded-xl bg-muted/15 border border-border px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💣</span>
                  <div>
                    <div className="text-xs font-bold text-white">ATKのみ選択可能</div>
                    <div className="text-[11px] text-muted-foreground">チェックを入れたらサイト（A/B/C）も選択</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {['A', 'B', 'C'].map(s => (
                    <div key={s} className="flex-1 rounded-lg bg-[#6C63FF]/15 border border-[#6C63FF]/30 py-1.5 text-center text-sm font-bold text-[#6C63FF]">{s}サイト</div>
                  ))}
                </div>
              </div>
            </StepCard>

            <StepCard number={9} title="FB（ファーストブラッド）を記録"
              why="「先に1人倒した側が勝ちやすい」のはVALORANTの大原則。FBを取った時の勝率とFDになった時の勝率を比較することで、エントリー選手の重要度が数値化されます。">
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg bg-[#00D4A0]/15 border border-[#00D4A0]/30 px-3 py-2 text-center">
                  <div className="text-sm font-bold text-[#00D4A0]">味方</div>
                  <div className="text-[10px] text-muted-foreground">自チームが先に1キル</div>
                </div>
                <div className="flex-1 rounded-lg bg-[#FF4655]/15 border border-[#FF4655]/30 px-3 py-2 text-center">
                  <div className="text-sm font-bold text-[#FF4655]">相手</div>
                  <div className="text-[10px] text-muted-foreground">相手に先に1キルされた</div>
                </div>
              </div>
              <TipBox type="warn">
                「最初にキルされた」のがどちらか迷ったら、ValorantのスコアボードのFB欄を確認してください。
              </TipBox>
            </StepCard>

            <StepCard number={10} title="プレイタイム（Early/Mid/Late）を記録"
              why="「ラッシュ（Early）されると弱い」「時間をかけたラウンドに強い」など、時間帯によるパターンがわかります。">
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                {[
                  { label: 'Early', sub: '〜25秒', desc: 'ラッシュ・速攻', color: '#FF4655' },
                  { label: 'Mid', sub: '25〜75秒', desc: 'デフォルト展開', color: '#6C63FF' },
                  { label: 'Late', sub: '75秒〜', desc: 'スロウ・待ち', color: '#E8B84B' },
                ].map(t => (
                  <div key={t.label} className="rounded-lg px-2.5 py-2 text-center"
                    style={{ background: `${t.color}15`, border: `1px solid ${t.color}30` }}>
                    <div className="font-bold text-xs" style={{ color: t.color }}>{t.label}</div>
                    <div className="text-[10px] text-muted-foreground">{t.sub}</div>
                    <div className="text-[10px] text-white mt-0.5">{t.desc}</div>
                  </div>
                ))}
              </div>
            </StepCard>

          </div>
        </div>
      </GuideSection>

      {/* ③ 用語解説 */}
      <GuideSection id="terms" icon={HelpCircle} title="③ 用語解説" color="#FFD700">
        <div className="pt-4 space-y-2">
          <p className="text-sm text-muted-foreground pb-2">各用語をタップすると詳細な説明が表示されます。</p>

          <TermCard term="FB" reading="ファーストブラッド" icon={Crosshair} color="#FFD700"
            short="そのラウンドで最初に出た1キル"
            detail="各ラウンドで最初に発生したキルのこと。FBを取ると「人数有利5vs4」の状態が生まれるため、ラウンド勝率が大幅に上がります。統計上、FBを取ったチームは約70%以上の確率でそのラウンドを勝ちます。" />

          <TermCard term="FD" reading="ファーストデス" icon={Crosshair} color="#FF4655"
            short="そのラウンドで最初に死んだ選手"
            detail="FBの逆。相手に先に1キルされること。FDになった選手は「人数不利4vs5」を作ってしまうため、チームにとって大きな負担になります。FDが多い選手は動き方の見直しが必要です。" />

          <TermCard term="リテイク" reading="りていく" icon={Shield} color="#6C63FF"
            short="爆弾設置後にDEFが奪い返す行動"
            detail="ATKが爆弾（スパイク）を設置した後、DEFチームがそのサイトを奪い返して爆弾を解除しようとすること。リテイク勝率が低いチームは、設置されてからの人数管理や侵入タイミングに問題があります。" />

          <TermCard term="ポストプラント" reading="ぽすとぷらんと" icon={Flag} color="#FF8C42"
            short="爆弾設置後の戦況・局面"
            detail="ATKが爆弾を置いた後の状況全体を指します。「ポストプラント勝率」は爆弾を置いてから勝てた割合。これが低い場合、設置後のポジション取りや情報共有が不足しています。" />

          <TermCard term="エコラウンド" reading="えころうんど" icon={Zap} color="#FF4655"
            short="お金を節約して軽装で戦うラウンド"
            detail="経済的に苦しい状況でお金を貯めるために、武器を買わず（または最低限の装備で）戦うラウンド。ピストルとナイフのみで戦うことが多い。エコラウンドで1本勝てると相手の経済を大きく崩せます。" />

          <TermCard term="フルバイ" reading="ふるばい" icon={TrendingUp} color="#00D4A0"
            short="全員が最高装備を揃えたラウンド"
            detail="全員がライフル（バンダル/ファントム）＋全スキルを購入した状態。最も強い状態で戦えます。フルバイ勝率が低い場合、武器性能の問題ではなく戦術・連携に課題があります。" />

          <TermCard term="ACS" reading="えーしーえす" icon={Target} color="#3B82F6"
            short="戦闘貢献度スコア（平均コンバットスコア）"
            detail="1ラウンドあたりの平均的な戦闘貢献度。キル数だけでなく、ダメージ・アシストなども加味されます。プロレベルは200〜300以上。初心者は100〜150程度から始まることが多いです。" />

          <TermCard term="エントリー" reading="えんとりー" icon={Crosshair} color="#FF8C42"
            short="サイトに最初に突っ込む役割"
            detail="ATKで最初にサイトに入る選手。最もリスクが高いポジションで、FBになりやすいです。しかしエントリーなしでは攻めが成立しないため、エントリー役の選手はFDが多くても正常なこともあります。" />

          <TermCard term="リテイク勝率" reading="りていくしょうりつ" icon={BarChart2} color="#9B59B6"
            short="爆弾設置後にDEFが奪い返せた確率"
            detail="例えばリテイク勝率30%は「設置された10回中3回しか奪い返せていない」ということ。70%以上あれば優秀。30%を下回る場合は要改善です。" />
        </div>
      </GuideSection>

      {/* ④ 分析の見方 */}
      <GuideSection id="analysis" icon={BarChart2} title="④ 分析の見方" color="#00D4A0">
        <div className="pt-4 space-y-5">

          <p className="text-sm text-muted-foreground leading-relaxed">
            ダッシュボードに表示される数値の読み方を説明します。
            数字が苦手でも、<span className="text-white font-medium">「50%が基準」</span>と覚えておけば大丈夫です。
          </p>

          <div className="rounded-xl bg-muted/15 border border-border px-4 py-3">
            <div className="text-xs font-bold text-[#00D4A0] mb-2">🟢 基本の読み方</div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#00D4A0] flex-shrink-0" />
                <span className="text-white font-medium">50%以上</span>
                <span className="text-muted-foreground">→ 強い・問題なし</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FF8C42] flex-shrink-0" />
                <span className="text-white font-medium">30〜49%</span>
                <span className="text-muted-foreground">→ 要注意・改善の余地あり</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FF4655] flex-shrink-0" />
                <span className="text-white font-medium">30%未満</span>
                <span className="text-muted-foreground">→ 重大な弱点・最優先で改善</span>
              </div>
            </div>
          </div>

          {[
            {
              title: '総合勝率',
              icon: '📊',
              desc: '全ラウンドの勝率。50%を下回っている場合、全体的な戦術見直しが必要です。',
              example: { from: '勝率32%', arrow: 'ATKが崩壊している可能性', to: 'ATK戦術を根本から見直す' },
            },
            {
              title: 'ATK/DEF勝率',
              icon: '⚔️',
              desc: '攻め/守りそれぞれの勝率。どちらかが著しく低い場合、そのサイドの戦術に問題があります。',
              example: { from: 'DEF勝率22%', arrow: 'リテイクできていない可能性', to: 'DEFポジションとリテイク経路を見直す' },
            },
            {
              title: 'FB影響',
              icon: '💀',
              desc: 'FBを取った時と取られた時の勝率差。差が大きいほど「最初の1キル」がそのチームに大きく影響しています。',
              example: { from: 'FB取得時70% FB被時15%', arrow: '先手に極端に依存', to: 'エントリーに安全を保証する戦術を練る' },
            },
            {
              title: 'サイト別勝率',
              icon: '📍',
              desc: 'A/Bサイト別の攻め・リテイク勝率。特定サイトだけ弱い場合、そのサイトの戦術を重点的に練習できます。',
              example: { from: 'Bリテイク勝率8%', arrow: 'B設置後に崩壊している', to: 'B設置後のDEFポジションを変更する' },
            },
          ].map(item => (
            <div key={item.title} className="space-y-2 bg-muted/10 rounded-xl border border-border/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-bold text-white">{item.title}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              <ExampleBox label="実例" items={[item.example]} />
            </div>
          ))}

          <TipBox type="good">
            分析は「一番悪い数字を1つ選んで改善する」ことから始めましょう。全部同時に直そうとすると練習が散漫になります。
          </TipBox>
        </div>
      </GuideSection>

      {/* ⑤ AIフィードバック */}
      <GuideSection id="ai" icon={Bot} title="⑤ AIフィードバック" color="#6C63FF">
        <div className="pt-4 space-y-4">

          <p className="text-sm text-muted-foreground leading-relaxed">
            AIは入力されたラウンドデータを分析し、<span className="text-white font-medium">プロコーチ視点のフィードバック</span>を生成します。
            試合詳細ページの「AI分析」ボタンから実行できます。
          </p>

          <div className="rounded-xl bg-[#6C63FF]/8 border border-[#6C63FF]/20 px-4 py-4 space-y-3">
            <div className="text-xs font-bold text-[#6C63FF] uppercase tracking-wider">AIが分析する7つの項目</div>
            {[
              { num: '1', label: '意図の推測', desc: 'チームが試みた戦術をデータから読み取ります' },
              { num: '2', label: '期待値評価', desc: 'その戦術選択が合理的だったかを判定します' },
              { num: '3', label: '崩壊点の特定', desc: '何ラウンド目に流れが変わったかを特定します' },
              { num: '4', label: '原因分離', desc: '問題が戦術・実行・判断・情報のどれかを分類します' },
              { num: '5', label: '再現性評価', desc: '勝ちが偶然か、再現できるものかを判定します' },
              { num: '6', label: '改善提案', desc: '誰が・いつ・何を・なぜ変えるべきかを提示します' },
              { num: '7', label: 'チームルール化', desc: '「if〜then〜」形式の再現可能なルールを生成します' },
            ].map(item => (
              <div key={item.num} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#6C63FF]/30 flex items-center justify-center text-[#6C63FF] text-xs font-black flex-shrink-0 mt-0.5">
                  {item.num}
                </div>
                <div>
                  <span className="text-sm font-bold text-white">{item.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <TipBox type="info">
            AIフィードバックは「スコアが高い＝良い試合」ではありません。低いスコアでも「改善策が明確」な試合は次に活かしやすい試合です。
          </TipBox>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white">AIフィードバックの読み方</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="text-[#FFD700] font-bold flex-shrink-0">🎯 勝敗要因</span>
                <span>「この試合が決まった本質的な理由」を1文で表します。一番重要な部分です。</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#FF4655] font-bold flex-shrink-0">⚠️ 崩壊点</span>
                <span>流れが変わったラウンドと状況。「なぜそのラウンドで崩れたか」を確認しましょう。</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#6C63FF] font-bold flex-shrink-0">📋 改善提案</span>
                <span>「誰が・いつ・何を変える」という形式。次のスクリム前に全員で共有してください。</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#FFD700] font-bold flex-shrink-0">📏 チームルール</span>
                <span>「もし〜なら〜する」という形式の行動原則。ルールブックに追加していきましょう。</span>
              </div>
            </div>
          </div>
        </div>
      </GuideSection>

      {/* ⑥ よくあるミス */}
      <GuideSection id="mistakes" icon={AlertTriangle} title="⑥ よくあるミス" color="#FF8C42">
        <div className="pt-4 space-y-3">

          <p className="text-sm text-muted-foreground pb-1">
            初心者が特につまずきやすいポイントをまとめました。
            データの質が分析の精度に直結するため、入力ミスに注意してください。
          </p>

          {[
            {
              icon: '❌',
              title: 'FB/FDを逆に入力する',
              bad: '相手にキルされた → 「味方」を選択してしまう',
              good: '誰が最初にキルされたかを確認してから入力する。自チームが先にキルした＝「味方」',
              color: '#FF4655',
            },
            {
              icon: '⚠️',
              title: 'プラントを記録し忘れる',
              bad: '爆弾を置いたラウンドなのに「プラント」チェックを入れ忘れる',
              good: '爆弾を置いたら必ずチェック。サイト（A/B/C）も忘れずに選択する',
              color: '#FF8C42',
            },
            {
              icon: '⚠️',
              title: '購入状況を全部「フルバイ」にする',
              bad: 'エコラウンドや二本目（セカンド）ラウンドを「フルバイ」にしてしまう',
              good: '資金状況を実際の試合と照合する。ピストルラウンド（R1・R13）は必ず「ピストル」を選択',
              color: '#FF8C42',
            },
            {
              icon: '❌',
              title: 'サイドを逆に設定する',
              bad: '前半DEFだったのに「ATK」を選択してしまい、全ラウンドのサイドが逆になる',
              good: '試合前半（R1〜12）に攻めていたか守っていたかを確認してから選択する',
              color: '#FF4655',
            },
            {
              icon: '💡',
              title: 'スコアを入力せずラウンド入力をしようとする',
              bad: 'ラウンド入力欄が表示されない',
              good: '先に「自チームスコア」と「相手スコア」を入力すると、ラウンド行が自動生成される',
              color: '#3B82F6',
            },
          ].map(item => (
            <div key={item.title} className="rounded-xl border overflow-hidden"
              style={{ borderColor: `${item.color}25` }}>
              <div className="px-4 py-3 flex items-center gap-2"
                style={{ background: `${item.color}10` }}>
                <span className="text-base">{item.icon}</span>
                <span className="text-sm font-bold text-white">{item.title}</span>
              </div>
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-[#FF4655] text-xs font-bold flex-shrink-0 mt-0.5">✗ NG</span>
                  <p className="text-xs text-muted-foreground">{item.bad}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#00D4A0] text-xs font-bold flex-shrink-0 mt-0.5">✓ OK</span>
                  <p className="text-xs text-muted-foreground">{item.good}</p>
                </div>
              </div>
            </div>
          ))}

          <TipBox type="good">
            入力に迷ったら、後から「試合履歴 → 編集」で修正できます。まずは入力することを優先しましょう。
          </TipBox>
        </div>
      </GuideSection>

      {/* Footer */}
      <div className="rounded-2xl border border-border bg-card px-5 py-5 text-center space-y-2">
        <div className="text-sm font-bold text-white">質問・不明点はお気軽に</div>
        <p className="text-xs text-muted-foreground">
          「このデータは何のため？」「うまく入力できない」など、<br />
          お問い合わせページからいつでも質問できます。
        </p>
        <a href="/contact"
          className="inline-flex items-center gap-2 mt-2 px-5 py-2 bg-[#FF4655]/15 hover:bg-[#FF4655]/25 text-[#FF4655] border border-[#FF4655]/30 rounded-xl text-sm font-medium transition-colors">
          お問い合わせへ →
        </a>
      </div>

    </div>
  )
}
