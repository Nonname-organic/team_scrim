'use client'

import { useState } from 'react'
import {
  ChevronDown, ChevronUp, BookOpen, ClipboardEdit, Lightbulb,
  BarChart2, AlertTriangle, CheckCircle2, Info, Crosshair,
  Shield, Zap, TrendingUp, Target, Flag, HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

// ─────────────────────────────────────────────────────────────────────────────
// Primitive components
// ─────────────────────────────────────────────────────────────────────────────

function GuideSection({
  id, icon: Icon, title, badge, color = '#6C63FF', defaultOpen = false, children,
}: {
  id: string; icon: React.ElementType; title: string; badge?: string
  color?: string; defaultOpen?: boolean; children: React.ReactNode
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
}: { number: number; title: string; why?: string; children: React.ReactNode }) {
  const { locale } = useLanguage()
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
              <span className="text-[#6C63FF] font-semibold">
                {locale === 'en' ? 'Why? ' : 'なぜ必要？ '}
              </span>{why}
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
  term: string; reading?: string; short: string; detail: string; color?: string; icon?: React.ElementType
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
            {reading && <span className="text-[11px] text-muted-foreground">({reading})</span>}
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
  const { locale } = useLanguage()
  const cfg = {
    info: { color: '#3B82F6', Icon: Info,         label: locale === 'en' ? 'Note'    : 'ポイント' },
    warn: { color: '#FF8C42', Icon: AlertTriangle, label: locale === 'en' ? 'Warning' : '注意' },
    good: { color: '#00D4A0', Icon: CheckCircle2,  label: locale === 'en' ? 'Tip'     : 'コツ' },
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

function MapDiagram({ label, sites }: { label: string; sites: { name: string; color: string; note?: string }[] }) {
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
// Content
// ─────────────────────────────────────────────────────────────────────────────

function getContent(locale: string) {
  const en = locale === 'en'
  return {
    hero: {
      title:    en ? 'Complete User Guide'                                                    : '完全操作ガイド',
      subtitle: en ? 'For VALORANT beginners & managers. From data entry to reading analysis — explained from scratch.'
                   : 'VALORANT未経験者・マネージャー向け。\n入力方法から分析の読み方まで、ゼロから解説します。',
      badges: en
        ? ['Beginner Friendly', 'For Managers', 'No Analyst Needed']
        : ['初心者OK', 'マネージャー向け', 'アナリスト不要'],
    },
    toc: en ? [
      { id: 'intro',    label: 'Introduction',        icon: BookOpen },
      { id: 'input',    label: 'Entering Match Data',  icon: ClipboardEdit },
      { id: 'terms',    label: 'Terminology',           icon: HelpCircle },
      { id: 'analysis', label: 'Reading Analysis',     icon: BarChart2 },
      { id: 'mistakes', label: 'Common Mistakes',      icon: AlertTriangle },
    ] : [
      { id: 'intro',    label: 'はじめに',         icon: BookOpen },
      { id: 'input',    label: 'スクリム入力方法',  icon: ClipboardEdit },
      { id: 'terms',    label: '用語解説',          icon: HelpCircle },
      { id: 'analysis', label: '分析の見方',        icon: BarChart2 },
      { id: 'mistakes', label: 'よくあるミス',      icon: AlertTriangle },
    ],
    tocLabel: en ? 'Contents' : '目次',
    intro: {
      sectionTitle: en ? '① Introduction'                   : '① はじめに',
      sectionBadge: en ? 'Read First'                        : '最初に読む',
      whatTitle:    en ? 'What can you do with this system?' : 'このシステムで何ができる？',
      whatDesc:     en
        ? 'AXELIA Analytics records and analyzes your scrim (practice match) data. Simply enter data after each match to understand your team\'s weaknesses and strengths in numbers.'
        : 'AXELIA Analytics は、スクリム（練習試合）のデータを記録・分析するツールです。試合後にデータを入力するだけで、チームの弱点・強みを数値で把握できます。',
      features: en ? [
        { icon: '📊', title: 'Find Weaknesses with Data', desc: '"Feels like defense is weak" — prove it with data and decide which drills to run first' },
        { icon: '📈', title: 'Visualize Growth',          desc: 'Charts update as you play, showing your team\'s improvement at a glance' },
        { icon: '🗂️', title: 'Record Every Match',        desc: 'Build a data history across scrims so you can compare trends over time' },
      ] : [
        { icon: '📊', title: 'データで弱点を発見', desc: '「なんとなく守りが弱い」をデータで証明し、優先練習メニューを決められる' },
        { icon: '📈', title: '成長が可視化',        desc: '試合を重ねるごとにグラフが更新され、チームの成長が一目でわかる' },
        { icon: '🗂️', title: '試合記録の蓄積',     desc: 'スクリムのデータを積み重ねることで、長期的なトレンド比較ができる' },
      ],
      whyTitle: en ? 'Why is analysis important?' : 'なぜ分析が重要なのか？',
      whyDesc: en
        ? 'Pro teams turn every match into data. Not hunches or impressions, but hard facts like "won X of Y rounds" — so improvements are concrete and actionable.'
        : 'プロチームは全ての試合をデータ化しています。勘や感想ではなく、「何ラウンド中何ラウンド勝ったか」という事実ベースで改善するためです。',
      exampleLabel: en ? 'Analysis makes improvements specific' : 'データがあると改善が具体的になる',
      examples: en ? [
        { from: '"Defense feels weak"',   arrow: 'Check the data', to: '"A site retake win rate 18% (needs work)"' },
        { from: '"Our eco rounds are bad"', arrow: 'Check the data', to: '"Eco win rate 11% → set a force-buy threshold"' },
      ] : [
        { from: '「守りが弱い気がする」', arrow: 'データで確認', to: '「Aリテイク勝率18%（要改善）」' },
        { from: '「エコが弱い」',         arrow: 'データで確認', to: '「エコラウンド勝率11%→フォース基準を作る」' },
      ],
      tip: en
        ? 'Data entry takes 5–10 minutes after a match. Once it becomes a habit, the direction for improvement becomes clear within a few sessions.'
        : 'データ入力は試合後5〜10分で完了します。習慣化することで、数試合後には改善の方向性が見えてきます。',
    },
    input: {
      sectionTitle: en ? '② Entering Match Data' : '② スクリム入力方法',
      navLabel:     en ? 'Match Input'            : '試合入力',
      matchInfoTitle: en ? 'Match Information'    : '試合情報の入力',
      roundDetailTitle: en ? 'Round Details'      : 'ラウンド詳細の入力',
      roundAutoGenDesc: en
        ? 'Once you enter the score, round rows are automatically generated. Fill in the following for each round.'
        : 'スコアを入力するとラウンド行が自動生成されます。各ラウンドについて以下を入力します。',
      steps: en ? [
        {
          title: 'Select the Date',
          why:   "Lets you compare 'last week's match' or 'vs last month' later. Best to enter right after the match.",
          desc:  'Choose the date the match was played from the calendar.',
        },
        {
          title: 'Enter Opponent Team Name',
          why:   "Records patterns like 'we beat this team but lose to that one'. Useful for analyzing matchup tendencies.",
          desc:  "Enter the opponent's team name. Abbreviations are fine.",
          tip:   { type: 'good' as const, text: 'If you face the same team multiple times, keep the spelling consistent for easier comparison.' },
        },
        {
          title: 'Select the Map',
          why:   "Tactics differ completely by map. Tracking map-by-map lets you spot strengths and weaknesses like 'weak on Bind' or 'strong on Haven'.",
          desc:  'Choose the map played from the dropdown.',
          mapLabel: 'Map Examples (VALORANT Competitive Maps)',
          mapSites: [
            { name: 'Bind',   color: '#FF4655', note: '2 sites' },
            { name: 'Haven',  color: '#FFD700', note: '3 sites' },
            { name: 'Ascent', color: '#00D4A0', note: '2 sites' },
            { name: 'Split',  color: '#6C63FF', note: '2 sites' },
          ],
        },
        {
          title: 'Enter Score (Your Team / Opponent)',
          why:   'Final score auto-calculates win rate and round count — the foundation of detailed round analysis.',
          desc:  'Example: My team 13 — 8 Opponent',
        },
        {
          title: 'Select First-Half Side (ATK / DEF)',
          why:   "Recording whether the first 12 rounds were ATK or DEF lets you find side-specific weaknesses like 'low ATK win rate'.",
          atkLabel: 'ATK (Attack)',  atkDesc: 'Carry the bomb and attack',
          defLabel: 'DEF (Defense)', defDesc: 'Guard the bomb and defend',
        },
      ] : [
        {
          title: '日付を選択',
          why:   '後から「先週の試合」「先月との比較」ができるようになります。試合直後に入力するのがおすすめ。',
          desc:  '試合が行われた日付をカレンダーから選びます。',
        },
        {
          title: '対戦相手チーム名を入力',
          why:   '「あのチームには勝てるが、このチームには負ける」というパターンを記録できます。スクリム相手との相性分析に使えます。',
          desc:  '相手チームの名前を入力します。略称でもOKです。',
          tip:   { type: 'good' as const, text: '同じチームに複数回当たる場合、表記を統一しておくと比較しやすくなります。' },
        },
        {
          title: 'マップを選択',
          why:   'マップごとに戦術が全く異なります。「Bindでの勝率が低い」「Havenは得意」など、マップ別の強弱を把握するために必須です。',
          desc:  'プルダウンからプレイしたマップを選びます。',
          mapLabel: 'マップ例（VALORANTの競技マップ）',
          mapSites: [
            { name: 'Bind',   color: '#FF4655', note: '2サイト' },
            { name: 'Haven',  color: '#FFD700', note: '3サイト' },
            { name: 'Ascent', color: '#00D4A0', note: '2サイト' },
            { name: 'Split',  color: '#6C63FF', note: '2サイト' },
          ],
        },
        {
          title: 'スコアを入力（自チーム / 相手）',
          why:   '最終スコアから勝率・ラウンド数が自動計算されます。詳細なラウンド分析の基盤になります。',
          desc:  '例: 自チーム 13 ー 8 相手',
        },
        {
          title: '前半サイドを選択（ATK/DEF）',
          why:   '前半12ラウンドがATKかDEFかを記録することで「ATK側の勝率が低い」など、サイド別の弱点を発見できます。',
          atkLabel: 'ATK（攻め）',  atkDesc: '爆弾を持って攻撃',
          defLabel: 'DEF（守り）',  defDesc: '爆弾を守って防衛',
        },
      ],
      roundFlow: en ? [
        { icon: '⚔️', label: 'Combat',  sub: 'R1 start' },
        { icon: '💀', label: 'FB/FD',   sub: 'First kill' },
        { icon: '💣', label: 'Plant',   sub: 'ATK only' },
        { icon: '🏳️', label: 'Result',  sub: 'W or L' },
      ] : [
        { icon: '⚔️', label: '戦闘',   sub: 'R1開始' },
        { icon: '💀', label: 'FB/FD',   sub: '最初の1キル' },
        { icon: '💣', label: 'プラント', sub: 'ATKのみ' },
        { icon: '🏳️', label: '勝敗',   sub: 'W or L' },
      ],
      roundSteps: en ? [
        {
          title: 'Select Economy (Purchase State)',
          why:   "Whether you can win with limited money (eco) is a key indicator of team strength. Teams that are only strong on full-buy fall apart on eco rounds.",
          ecoItems: [
            { label: 'Pistol',   desc: 'R1 & R13 opening rounds',               color: '#FFD700' },
            { label: 'Eco',      desc: 'Saving — minimal or no weapons',         color: '#FF4655' },
            { label: 'Full Buy', desc: 'Rifles + full abilities purchased',      color: '#00D4A0' },
            { label: 'Force',    desc: 'Forced buy despite limited funds',       color: '#FF8C42' },
          ],
        },
        {
          title: 'Select Result (W / L)',
          why:   'Accumulating round results lets you automatically see which situations have high or low win rates.',
          wLabel: 'W (Win)', lLabel: 'L (Loss)',
        },
        {
          title: 'Record Plant (Bomb Planted)',
          why:   "Post-plant win rate is a critical tactical metric. If you're planting but still losing, there's a problem with positioning or info sharing after the plant.",
          atkOnly: 'ATK Only',
          atkOnlySub: 'When checked, also select the site (A/B/C)',
          sites: ['A', 'B', 'C'],
          siteLabel: (s: string) => `${s} Site`,
        },
        {
          title: 'Record FB (First Blood)',
          why:   "'Whoever gets the first kill wins the round' is a fundamental rule in VALORANT. Comparing win rate when your team gets FB vs. when the enemy does quantifies the importance of entry players.",
          usLabel: 'Ally',   usDesc: 'Your team gets the first kill',
          themLabel: 'Enemy', themDesc: 'Enemy gets the first kill',
          tip: { type: 'warn' as const, text: "If you're unsure who was killed first, check the FB column on the VALORANT scoreboard." },
        },
        {
          title: 'Record Play Timing (Early / Mid / Late)',
          why:   "Reveals patterns like 'weak against rushes (Early)' or 'strong in slow rounds (Late)'.",
          timings: [
            { label: 'Early', sub: '~25s',    desc: 'Rush / fast push', color: '#FF4655' },
            { label: 'Mid',   sub: '25~75s',  desc: 'Default play',    color: '#6C63FF' },
            { label: 'Late',  sub: '75s+',    desc: 'Slow / hold',     color: '#E8B84B' },
          ],
        },
      ] : [
        {
          title: '購入状況（エコノミー）を選択',
          why:   '「お金がない時（エコ）でも勝てるか」はチームの実力の重要な指標です。フルバイ時だけ強いチームは、エコラウンドで大きく崩れます。',
          ecoItems: [
            { label: 'ピストル', desc: 'R1・R13の開始ラウンド',              color: '#FFD700' },
            { label: 'エコ',     desc: '武器なし/軽装で戦う節約ラウンド',   color: '#FF4655' },
            { label: 'フルバイ', desc: 'ライフル+全スキル完全購入',          color: '#00D4A0' },
            { label: 'フォース', desc: '資金不足でも無理やり買うラウンド',   color: '#FF8C42' },
          ],
        },
        {
          title: '結果（W / L）を選択',
          why:   'ラウンドの勝敗が蓄積されることで、どの状況で勝率が高いか・低いかが自動的に分析されます。',
          wLabel: 'W（勝利）', lLabel: 'L（敗北）',
        },
        {
          title: 'プラント（爆弾設置）を記録',
          why:   '「爆弾を置いた後の勝率（ポストプラント勝率）」は重要な戦術指標です。爆弾を置けているのに勝てない場合、ポジション取りや情報共有に問題があります。',
          atkOnly: 'ATKのみ選択可能',
          atkOnlySub: 'チェックを入れたらサイト（A/B/C）も選択',
          sites: ['A', 'B', 'C'],
          siteLabel: (s: string) => `${s}サイト`,
        },
        {
          title: 'FB（ファーストブラッド）を記録',
          why:   '「先に1人倒した側が勝ちやすい」のはVALORANTの大原則。FBを取った時の勝率とFDになった時の勝率を比較することで、エントリー選手の重要度が数値化されます。',
          usLabel: '味方',   usDesc: '自チームが先に1キル',
          themLabel: '相手',  themDesc: '相手に先に1キルされた',
          tip: { type: 'warn' as const, text: '「最初にキルされた」のがどちらか迷ったら、ValorantのスコアボードのFB欄を確認してください。' },
        },
        {
          title: 'プレイタイム（Early/Mid/Late）を記録',
          why:   '「ラッシュ（Early）されると弱い」「時間をかけたラウンドに強い」など、時間帯によるパターンがわかります。',
          timings: [
            { label: 'Early', sub: '〜25秒',   desc: 'ラッシュ・速攻', color: '#FF4655' },
            { label: 'Mid',   sub: '25〜75秒', desc: 'デフォルト展開', color: '#6C63FF' },
            { label: 'Late',  sub: '75秒〜',   desc: 'スロウ・待ち',   color: '#E8B84B' },
          ],
        },
      ],
    },
    terms: {
      sectionTitle: en ? '③ Terminology' : '③ 用語解説',
      intro: en ? 'Tap each term to see a detailed explanation.' : '各用語をタップすると詳細な説明が表示されます。',
      items: en ? [
        { term: 'FB',           reading: 'First Blood', icon: Crosshair, color: '#FFD700',
          short: 'The first kill of that round',
          detail: 'The first kill that occurs each round. Getting FB creates a 5v4 man-advantage situation, significantly raising the round win rate. Statistically, the team that gets FB wins the round ~70% of the time.' },
        { term: 'FD',           reading: 'First Death',  icon: Crosshair, color: '#FF4655',
          short: 'The first player to die in the round',
          detail: "The opposite of FB. Being killed first by the enemy creates a 4v5 disadvantage. Players with high FD counts may need to rethink their movement patterns." },
        { term: 'Retake',       icon: Shield, color: '#6C63FF',
          short: "DEF team reclaiming a site after the bomb is planted",
          detail: "After ATK plants the spike, the DEF team tries to retake the site and defuse it. A low retake win rate suggests problems with headcount management or push timing after the plant." },
        { term: 'Post-Plant',   icon: Flag, color: '#FF8C42',
          short: 'The state of play after the bomb is planted',
          detail: "Refers to the entire situation after ATK plants the spike. 'Post-plant win rate' is how often the round is won after planting. If this is low, DEF positioning and info sharing after the plant need work." },
        { term: 'Eco Round',    icon: Zap, color: '#FF4655',
          short: 'A round fought with minimal gear to save money',
          detail: "A round where the team saves money by skipping weapon purchases (or buying only minimal gear). Often fought with pistols and knives. Winning an eco round can severely damage the enemy economy." },
        { term: 'Full Buy',     icon: TrendingUp, color: '#00D4A0',
          short: 'Everyone on the team buys full equipment',
          detail: "Everyone buys rifles (Vandal/Phantom) + full abilities. The strongest possible state. If full-buy win rate is low, the issue is tactics and teamwork — not gear." },
        { term: 'ACS',          reading: 'Average Combat Score', icon: Target, color: '#3B82F6',
          short: 'Combat contribution score per round',
          detail: "Average combat contribution per round. Factors in damage and assists, not just kills. Pro-level is 200–300+. Beginners typically start around 100–150." },
        { term: 'Entry Fragger', icon: Crosshair, color: '#FF8C42',
          short: 'The player who pushes into a site first',
          detail: "On ATK, the first player to enter a site. Highest-risk position and most likely to be FD. However, without an entry player attacks cannot happen — so higher FD counts may be expected and normal." },
        { term: 'Retake Win Rate', icon: BarChart2, color: '#9B59B6',
          short: 'The % of times DEF successfully reclaims a planted site',
          detail: "e.g., 30% retake win rate means 3 out of 10 plants were retaken. 70%+ is excellent. Below 30% needs improvement." },
      ] : [
        { term: 'FB',         reading: 'ファーストブラッド', icon: Crosshair, color: '#FFD700',
          short: 'そのラウンドで最初に出た1キル',
          detail: '各ラウンドで最初に発生したキルのこと。FBを取ると「人数有利5vs4」の状態が生まれるため、ラウンド勝率が大幅に上がります。統計上、FBを取ったチームは約70%以上の確率でそのラウンドを勝ちます。' },
        { term: 'FD',         reading: 'ファーストデス',    icon: Crosshair, color: '#FF4655',
          short: 'そのラウンドで最初に死んだ選手',
          detail: 'FBの逆。相手に先に1キルされること。FDになった選手は「人数不利4vs5」を作ってしまうため、チームにとって大きな負担になります。FDが多い選手は動き方の見直しが必要です。' },
        { term: 'リテイク',   reading: 'りていく',          icon: Shield, color: '#6C63FF',
          short: '爆弾設置後にDEFが奪い返す行動',
          detail: 'ATKが爆弾（スパイク）を設置した後、DEFチームがそのサイトを奪い返して爆弾を解除しようとすること。リテイク勝率が低いチームは、設置されてからの人数管理や侵入タイミングに問題があります。' },
        { term: 'ポストプラント', reading: 'ぽすとぷらんと', icon: Flag, color: '#FF8C42',
          short: '爆弾設置後の戦況・局面',
          detail: 'ATKが爆弾を置いた後の状況全体を指します。「ポストプラント勝率」は爆弾を置いてから勝てた割合。これが低い場合、設置後のポジション取りや情報共有が不足しています。' },
        { term: 'エコラウンド', reading: 'えころうんど', icon: Zap, color: '#FF4655',
          short: 'お金を節約して軽装で戦うラウンド',
          detail: '経済的に苦しい状況でお金を貯めるために、武器を買わず（または最低限の装備で）戦うラウンド。ピストルとナイフのみで戦うことが多い。エコラウンドで1本勝てると相手の経済を大きく崩せます。' },
        { term: 'フルバイ',   reading: 'ふるばい', icon: TrendingUp, color: '#00D4A0',
          short: '全員が最高装備を揃えたラウンド',
          detail: '全員がライフル（バンダル/ファントム）＋全スキルを購入した状態。最も強い状態で戦えます。フルバイ勝率が低い場合、武器性能の問題ではなく戦術・連携に課題があります。' },
        { term: 'ACS',        reading: 'えーしーえす', icon: Target, color: '#3B82F6',
          short: '戦闘貢献度スコア（平均コンバットスコア）',
          detail: '1ラウンドあたりの平均的な戦闘貢献度。キル数だけでなく、ダメージ・アシストなども加味されます。プロレベルは200〜300以上。初心者は100〜150程度から始まることが多いです。' },
        { term: 'エントリー', reading: 'えんとりー', icon: Crosshair, color: '#FF8C42',
          short: 'サイトに最初に突っ込む役割',
          detail: 'ATKで最初にサイトに入る選手。最もリスクが高いポジションで、FBになりやすいです。しかしエントリーなしでは攻めが成立しないため、エントリー役の選手はFDが多くても正常なこともあります。' },
        { term: 'リテイク勝率', reading: 'りていくしょうりつ', icon: BarChart2, color: '#9B59B6',
          short: '爆弾設置後にDEFが奪い返せた確率',
          detail: '例えばリテイク勝率30%は「設置された10回中3回しか奪い返せていない」ということ。70%以上あれば優秀。30%を下回る場合は要改善です。' },
      ],
    },
    analysis: {
      sectionTitle: en ? '④ Reading Analysis' : '④ 分析の見方',
      intro: en
        ? "Here's how to read the numbers shown on the dashboard. Even if numbers aren't your thing, just remember: 50% is the benchmark."
        : 'ダッシュボードに表示される数値の読み方を説明します。数字が苦手でも、「50%が基準」と覚えておけば大丈夫です。',
      legend: en ? [
        { color: '#00D4A0', label: '50% or above', sub: '→ Strong / no problem' },
        { color: '#FF8C42', label: '30–49%',        sub: '→ Caution / room to improve' },
        { color: '#FF4655', label: 'Below 30%',     sub: '→ Critical weakness / top priority' },
      ] : [
        { color: '#00D4A0', label: '50%以上',  sub: '→ 強い・問題なし' },
        { color: '#FF8C42', label: '30〜49%',  sub: '→ 要注意・改善の余地あり' },
        { color: '#FF4655', label: '30%未満',  sub: '→ 重大な弱点・最優先で改善' },
      ],
      legendTitle: en ? '🟢 How to Read' : '🟢 基本の読み方',
      items: en ? [
        {
          title: 'Overall Win Rate', icon: '📊',
          desc: 'Win rate across all rounds. If below 50%, an overall tactical overhaul is needed.',
          example: { from: 'Win rate 32%', arrow: 'ATK may be collapsing', to: 'Rethink ATK tactics from the ground up' },
        },
        {
          title: 'ATK / DEF Win Rate', icon: '⚔️',
          desc: 'Win rate for attack / defense separately. If one is significantly lower, that side has tactical issues.',
          example: { from: 'DEF win rate 22%', arrow: 'Unable to retake', to: 'Rework DEF positions and retake routes' },
        },
        {
          title: 'FB Impact', icon: '💀',
          desc: "Win rate difference between rounds where your team got FB vs. where the enemy did. A large gap means 'first kill' has an outsized effect on your team.",
          example: { from: 'FB 70% / FD 15%', arrow: 'Extreme reliance on going first', to: 'Develop tactics that protect entry players' },
        },
        {
          title: 'Site Win Rate', icon: '📍',
          desc: 'Attack / retake win rate broken down by A/B site. If one site is consistently weak, practice can be focused there.',
          example: { from: 'B retake 8%', arrow: 'Collapsing after B plant', to: 'Change DEF positions after B plant' },
        },
      ] : [
        {
          title: '総合勝率', icon: '📊',
          desc: '全ラウンドの勝率。50%を下回っている場合、全体的な戦術見直しが必要です。',
          example: { from: '勝率32%', arrow: 'ATKが崩壊している可能性', to: 'ATK戦術を根本から見直す' },
        },
        {
          title: 'ATK/DEF勝率', icon: '⚔️',
          desc: '攻め/守りそれぞれの勝率。どちらかが著しく低い場合、そのサイドの戦術に問題があります。',
          example: { from: 'DEF勝率22%', arrow: 'リテイクできていない可能性', to: 'DEFポジションとリテイク経路を見直す' },
        },
        {
          title: 'FB影響', icon: '💀',
          desc: 'FBを取った時と取られた時の勝率差。差が大きいほど「最初の1キル」がそのチームに大きく影響しています。',
          example: { from: 'FB取得時70% FB被時15%', arrow: '先手に極端に依存', to: 'エントリーに安全を保証する戦術を練る' },
        },
        {
          title: 'サイト別勝率', icon: '📍',
          desc: 'A/Bサイト別の攻め・リテイク勝率。特定サイトだけ弱い場合、そのサイトの戦術を重点的に練習できます。',
          example: { from: 'Bリテイク勝率8%', arrow: 'B設置後に崩壊している', to: 'B設置後のDEFポジションを変更する' },
        },
      ],
      exampleLabel: en ? 'Example' : '実例',
      tip: en
        ? 'Start by picking the single worst number and focusing on fixing that. Trying to fix everything at once scatters your practice sessions.'
        : '分析は「一番悪い数字を1つ選んで改善する」ことから始めましょう。全部同時に直そうとすると練習が散漫になります。',
    },
    mistakes: {
      sectionTitle: en ? '⑤ Common Mistakes' : '⑤ よくあるミス',
      intro: en
        ? "Common pitfalls for beginners. Data quality directly affects analysis accuracy — pay attention to input errors."
        : '初心者が特につまずきやすいポイントをまとめました。データの質が分析の精度に直結するため、入力ミスに注意してください。',
      items: en ? [
        {
          icon: '❌', color: '#FF4655',
          title: 'Entering FB/FD backwards',
          bad:  'Enemy kills your player first → accidentally selecting "Ally"',
          good: 'Confirm who was killed first before entering. Your team kills first = "Ally"',
        },
        {
          icon: '⚠️', color: '#FF8C42',
          title: 'Forgetting to record the plant',
          bad:  'A plant happened but the "Plant" checkbox is left unchecked',
          good: 'Always check the box when the bomb is planted. Also select the site (A/B/C)',
        },
        {
          icon: '⚠️', color: '#FF8C42',
          title: 'Setting every round to "Full Buy"',
          bad:  'Setting eco or second-round purchases as "Full Buy"',
          good: 'Cross-reference with the actual match. Pistol rounds (R1 & R13) must be set to "Pistol"',
        },
        {
          icon: '❌', color: '#FF4655',
          title: 'Getting the side wrong',
          bad:  'First half was DEF but "ATK" is selected, flipping every round\'s side',
          good: 'Confirm whether you were attacking or defending in R1–12 before selecting',
        },
        {
          icon: '💡', color: '#3B82F6',
          title: 'Trying to enter rounds before the score',
          bad:  'Round entry rows are not visible',
          good: 'Enter "My team score" and "Opponent score" first — round rows are generated automatically',
        },
      ] : [
        {
          icon: '❌', color: '#FF4655',
          title: 'FB/FDを逆に入力する',
          bad:  '相手にキルされた → 「味方」を選択してしまう',
          good: '誰が最初にキルされたかを確認してから入力する。自チームが先にキルした＝「味方」',
        },
        {
          icon: '⚠️', color: '#FF8C42',
          title: 'プラントを記録し忘れる',
          bad:  '爆弾を置いたラウンドなのに「プラント」チェックを入れ忘れる',
          good: '爆弾を置いたら必ずチェック。サイト（A/B/C）も忘れずに選択する',
        },
        {
          icon: '⚠️', color: '#FF8C42',
          title: '購入状況を全部「フルバイ」にする',
          bad:  'エコラウンドや二本目（セカンド）ラウンドを「フルバイ」にしてしまう',
          good: '資金状況を実際の試合と照合する。ピストルラウンド（R1・R13）は必ず「ピストル」を選択',
        },
        {
          icon: '❌', color: '#FF4655',
          title: 'サイドを逆に設定する',
          bad:  '前半DEFだったのに「ATK」を選択してしまい、全ラウンドのサイドが逆になる',
          good: '試合前半（R1〜12）に攻めていたか守っていたかを確認してから選択する',
        },
        {
          icon: '💡', color: '#3B82F6',
          title: 'スコアを入力せずラウンド入力をしようとする',
          bad:  'ラウンド入力欄が表示されない',
          good: '先に「自チームスコア」と「相手スコア」を入力すると、ラウンド行が自動生成される',
        },
      ],
      ngLabel: '✗ NG', okLabel: '✓ OK',
      tip: en
        ? "If you're unsure about an entry, you can fix it later via 'Match History → Edit'. Prioritize entering data first."
        : '入力に迷ったら、後から「試合履歴 → 編集」で修正できます。まずは入力することを優先しましょう。',
    },
    footer: {
      title:   en ? 'Questions? Reach out anytime.' : '質問・不明点はお気軽に',
      desc:    en
        ? 'Confused about what a stat means, or having trouble entering data?\nYou can ask anything from the contact page.'
        : '「このデータは何のため？」「うまく入力できない」など、\nお問い合わせページからいつでも質問できます。',
      cta: en ? 'Go to Contact →' : 'お問い合わせへ →',
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function GuidePage() {
  const { locale } = useLanguage()
  const c = getContent(locale)
  const inp = c.input

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-12">

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-[#6C63FF]/15 to-[#FF4655]/10 border border-[#6C63FF]/20 px-6 py-8 text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-[#6C63FF]/20 flex items-center justify-center mx-auto">
          <BookOpen className="w-7 h-7 text-[#6C63FF]" />
        </div>
        <h1 className="text-2xl font-black text-white">{c.hero.title}</h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed whitespace-pre-line">
          {c.hero.subtitle}
        </p>
        <div className="flex items-center justify-center gap-4 pt-1 flex-wrap">
          {c.hero.badges.map(t => (
            <span key={t} className="text-[11px] text-[#6C63FF] bg-[#6C63FF]/10 px-2.5 py-1 rounded-full border border-[#6C63FF]/20">
              ✓ {t}
            </span>
          ))}
        </div>
      </div>

      {/* Table of Contents */}
      <div className="rounded-2xl border border-border bg-card px-5 py-4">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">{c.tocLabel}</div>
        <div className="grid grid-cols-2 gap-1.5">
          {c.toc.map(({ id, label, icon: Icon }) => (
            <a key={id} href={`#${id}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-muted/30 transition-colors">
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* ① Introduction */}
      <GuideSection id="intro" icon={BookOpen} title={c.intro.sectionTitle} color="#6C63FF" badge={c.intro.sectionBadge} defaultOpen>
        <div className="pt-4 space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white">{c.intro.whatTitle}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{c.intro.whatDesc}</p>
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {c.intro.features.map(item => (
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
            <h3 className="text-sm font-bold text-white">{c.intro.whyTitle}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{c.intro.whyDesc}</p>
          </div>
          <ExampleBox label={c.intro.exampleLabel} items={c.intro.examples} />
          <TipBox type="info">{c.intro.tip}</TipBox>
        </div>
      </GuideSection>

      {/* ② Match Data Entry */}
      <GuideSection id="input" icon={ClipboardEdit} title={inp.sectionTitle} color="#FF4655">
        <div className="pt-4 space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {locale === 'en'
              ? <>Navigate to <span className="text-white font-medium">{inp.navLabel}</span> in the sidebar and enter from top to bottom.</>
              : <>サイドバーの「<span className="text-white font-medium">{inp.navLabel}</span>」から入力します。上から順に入力していくだけでOKです。</>}
          </p>

          {/* Match info steps */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white border-l-2 border-[#FF4655] pl-3">{inp.matchInfoTitle}</h3>
            {inp.steps.map((s, idx) => (
              <StepCard key={idx} number={idx + 1} title={s.title} why={s.why}>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
                {'tip' in s && s.tip && <TipBox type={s.tip.type}>{s.tip.text}</TipBox>}
                {'mapLabel' in s && s.mapLabel && (
                  <MapDiagram label={s.mapLabel} sites={s.mapSites!} />
                )}
                {'atkLabel' in s && s.atkLabel && (
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-lg bg-[#FF8C42]/15 border border-[#FF8C42]/30 px-3 py-2 text-center">
                      <Crosshair className="w-4 h-4 text-[#FF8C42] mx-auto mb-1" />
                      <div className="text-xs font-bold text-[#FF8C42]">{s.atkLabel}</div>
                      <div className="text-[10px] text-muted-foreground">{s.atkDesc}</div>
                    </div>
                    <div className="flex-1 rounded-lg bg-[#00D4A0]/15 border border-[#00D4A0]/30 px-3 py-2 text-center">
                      <Shield className="w-4 h-4 text-[#00D4A0] mx-auto mb-1" />
                      <div className="text-xs font-bold text-[#00D4A0]">{s.defLabel}</div>
                      <div className="text-[10px] text-muted-foreground">{s.defDesc}</div>
                    </div>
                  </div>
                )}
              </StepCard>
            ))}
          </div>

          {/* Round detail steps */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white border-l-2 border-[#FF4655] pl-3">{inp.roundDetailTitle}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{inp.roundAutoGenDesc}</p>
            <RoundFlow steps={inp.roundFlow} />

            {inp.roundSteps.map((s, idx) => (
              <StepCard key={idx} number={idx + 6} title={s.title} why={s.why}>
                {'ecoItems' in s && s.ecoItems && (
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {s.ecoItems.map(e => (
                      <div key={e.label} className="flex items-center gap-2 bg-muted/20 rounded-lg px-2.5 py-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: e.color }} />
                        <div>
                          <span className="font-bold text-white">{e.label}</span>
                          <p className="text-muted-foreground text-[10px]">{e.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {'wLabel' in s && s.wLabel && (
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-lg bg-[#00D4A0]/15 border border-[#00D4A0]/40 px-3 py-2 text-center text-sm font-black text-[#00D4A0]">{s.wLabel}</div>
                    <div className="flex-1 rounded-lg bg-[#FF4655]/15 border border-[#FF4655]/40 px-3 py-2 text-center text-sm font-black text-[#FF4655]">{s.lLabel}</div>
                  </div>
                )}
                {'atkOnly' in s && s.atkOnly && (
                  <div className="rounded-xl bg-muted/15 border border-border px-4 py-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💣</span>
                      <div>
                        <div className="text-xs font-bold text-white">{s.atkOnly}</div>
                        <div className="text-[11px] text-muted-foreground">{s.atkOnlySub}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {s.sites!.map(site => (
                        <div key={site} className="flex-1 rounded-lg bg-[#6C63FF]/15 border border-[#6C63FF]/30 py-1.5 text-center text-sm font-bold text-[#6C63FF]">
                          {s.siteLabel!(site)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {'usLabel' in s && s.usLabel && (
                  <>
                    <div className="flex gap-2">
                      <div className="flex-1 rounded-lg bg-[#00D4A0]/15 border border-[#00D4A0]/30 px-3 py-2 text-center">
                        <div className="text-sm font-bold text-[#00D4A0]">{s.usLabel}</div>
                        <div className="text-[10px] text-muted-foreground">{s.usDesc}</div>
                      </div>
                      <div className="flex-1 rounded-lg bg-[#FF4655]/15 border border-[#FF4655]/30 px-3 py-2 text-center">
                        <div className="text-sm font-bold text-[#FF4655]">{s.themLabel}</div>
                        <div className="text-[10px] text-muted-foreground">{s.themDesc}</div>
                      </div>
                    </div>
                    {s.tip && <TipBox type={s.tip.type}>{s.tip.text}</TipBox>}
                  </>
                )}
                {'timings' in s && s.timings && (
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    {s.timings.map(t => (
                      <div key={t.label} className="rounded-lg px-2.5 py-2 text-center"
                        style={{ background: `${t.color}15`, border: `1px solid ${t.color}30` }}>
                        <div className="font-bold text-xs" style={{ color: t.color }}>{t.label}</div>
                        <div className="text-[10px] text-muted-foreground">{t.sub}</div>
                        <div className="text-[10px] text-white mt-0.5">{t.desc}</div>
                      </div>
                    ))}
                  </div>
                )}
              </StepCard>
            ))}
          </div>
        </div>
      </GuideSection>

      {/* ③ Terminology */}
      <GuideSection id="terms" icon={HelpCircle} title={c.terms.sectionTitle} color="#FFD700">
        <div className="pt-4 space-y-2">
          <p className="text-sm text-muted-foreground pb-2">{c.terms.intro}</p>
          {c.terms.items.map(item => (
            <TermCard key={item.term} {...item} />
          ))}
        </div>
      </GuideSection>

      {/* ④ Reading Analysis */}
      <GuideSection id="analysis" icon={BarChart2} title={c.analysis.sectionTitle} color="#00D4A0">
        <div className="pt-4 space-y-5">
          <p className="text-sm text-muted-foreground leading-relaxed">{c.analysis.intro}</p>

          <div className="rounded-xl bg-muted/15 border border-border px-4 py-3">
            <div className="text-xs font-bold text-[#00D4A0] mb-2">{c.analysis.legendTitle}</div>
            <div className="space-y-1.5 text-sm">
              {c.analysis.legend.map(l => (
                <div key={l.label} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: l.color }} />
                  <span className="text-white font-medium">{l.label}</span>
                  <span className="text-muted-foreground">{l.sub}</span>
                </div>
              ))}
            </div>
          </div>

          {c.analysis.items.map(item => (
            <div key={item.title} className="space-y-2 bg-muted/10 rounded-xl border border-border/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-bold text-white">{item.title}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              <ExampleBox label={c.analysis.exampleLabel} items={[item.example]} />
            </div>
          ))}

          <TipBox type="good">{c.analysis.tip}</TipBox>
        </div>
      </GuideSection>

      {/* ⑤ Common Mistakes */}
      <GuideSection id="mistakes" icon={AlertTriangle} title={c.mistakes.sectionTitle} color="#FF8C42">
        <div className="pt-4 space-y-3">
          <p className="text-sm text-muted-foreground pb-1">{c.mistakes.intro}</p>
          {c.mistakes.items.map(item => (
            <div key={item.title} className="rounded-xl border overflow-hidden"
              style={{ borderColor: `${item.color}25` }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: `${item.color}10` }}>
                <span className="text-base">{item.icon}</span>
                <span className="text-sm font-bold text-white">{item.title}</span>
              </div>
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-[#FF4655] text-xs font-bold flex-shrink-0 mt-0.5">{c.mistakes.ngLabel}</span>
                  <p className="text-xs text-muted-foreground">{item.bad}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#00D4A0] text-xs font-bold flex-shrink-0 mt-0.5">{c.mistakes.okLabel}</span>
                  <p className="text-xs text-muted-foreground">{item.good}</p>
                </div>
              </div>
            </div>
          ))}
          <TipBox type="good">{c.mistakes.tip}</TipBox>
        </div>
      </GuideSection>

      {/* Footer */}
      <div className="rounded-2xl border border-border bg-card px-5 py-5 text-center space-y-2">
        <div className="text-sm font-bold text-white">{c.footer.title}</div>
        <p className="text-xs text-muted-foreground whitespace-pre-line">{c.footer.desc}</p>
        <a href="/contact"
          className="inline-flex items-center gap-2 mt-2 px-5 py-2 bg-[#FF4655]/15 hover:bg-[#FF4655]/25 text-[#FF4655] border border-[#FF4655]/30 rounded-xl text-sm font-medium transition-colors">
          {c.footer.cta}
        </a>
      </div>

    </div>
  )
}
