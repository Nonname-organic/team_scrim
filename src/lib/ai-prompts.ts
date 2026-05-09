// ============================================================
// AI Coaching Prompt Templates
// VALORANTコーチ視点の分析プロンプト
// ============================================================

// ============================================================
// Tactical Analyst Prompt — per-match structured analysis (7-step framework)
// ============================================================

export function buildTacticalFeedbackPrompt(
  match: Record<string, unknown>,
  rounds: Record<string, unknown>[],
  playerStats: Record<string, unknown>[]
): string {
  const atkRounds = rounds.filter(r => r.side === 'attack')
  const defRounds = rounds.filter(r => r.side === 'defense')

  const summarizePhase = (rs: Record<string, unknown>[]) => {
    if (!rs.length) return 'なし'
    const wins    = rs.filter(r => r.result === 'win').length
    const fb      = rs.filter(r => r.first_blood_team === true).length
    const planted = rs.filter(r => r.planted === true).length
    const retake  = rs.filter(r => r.retake === true).length
    return `${wins}W/${rs.length}R FB${fb} プラント${planted} リテイク${retake}`
  }

  const econSummary = () => {
    const types = ['full', 'eco', 'force', 'semi_eco', 'second', 'third', 'pistol']
    return types.flatMap(t => {
      const rs = rounds.filter(r => r.economy_type === t)
      if (!rs.length) return []
      const w = rs.filter(r => r.result === 'win').length
      return [`${t}: ${w}/${rs.length}勝`]
    }).join(' | ') || '記録なし'
  }

  const fb    = rounds.filter(r => r.first_blood_team === true).length
  const fd    = rounds.filter(r => r.first_blood_team === false).length
  const fbWr  = rounds.filter(r => r.first_blood_team === true  && r.result === 'win').length
  const fdWr  = rounds.filter(r => r.first_blood_team === false && r.result === 'win').length

  const keyRounds = rounds
    .filter(r => r.first_blood_team !== null || r.retake || r.notable)
    .slice(0, 10)
    .map(r => ({
      round: r.round_number,
      side:  r.side,
      result: r.result,
      fb_taken: r.first_blood_team === true,
      fb_lost:  r.first_blood_team === false,
      retake:  r.retake ?? false,
      planted: r.planted ?? false,
      site:    r.plant_site ?? null,
      economy: r.economy_type ?? null,
      notable: r.notable ?? false,
    }))

  const plantSites = [...new Set(
    rounds.filter(r => r.plant_site).map(r => r.plant_site)
  )]

  const input = {
    map: match.map,
    sides: { atk: atkRounds.length, def: defRounds.length },
    result: `${match.result === 'win' ? '勝利' : '敗北'} (${match.team_score}-${match.opponent_score}) vs ${match.opponent_name}`,
    team_comp: playerStats.map(p => p.agent).filter(Boolean),
    economy: econSummary(),
    timeline: {
      early: `R1-5: ${summarizePhase(rounds.filter(r => Number(r.round_number) <= 5))}`,
      mid:   `R6-12: ${summarizePhase(rounds.filter(r => Number(r.round_number) >= 6 && Number(r.round_number) <= 12))}`,
      late:  `R13+: ${summarizePhase(rounds.filter(r => Number(r.round_number) >= 13))}`,
    },
    first_blood: {
      taken: `${fb}R (WR ${fb > 0 ? Math.round(fbWr/fb*100) : 0}%)`,
      lost:  `${fd}R (WR ${fd > 0 ? Math.round(fdWr/fd*100) : 0}%)`,
    },
    atk_wr: atkRounds.length > 0 ? `${Math.round(atkRounds.filter(r => r.result === 'win').length / atkRounds.length * 100)}%` : 'N/A',
    def_wr: defRounds.length > 0 ? `${Math.round(defRounds.filter(r => r.result === 'win').length / defRounds.length * 100)}%` : 'N/A',
    post_plant_wr: (() => {
      const pp = rounds.filter(r => r.planted)
      return pp.length > 0 ? `${Math.round(pp.filter(r => r.result === 'win').length / pp.length * 100)}%` : 'N/A'
    })(),
    plant_sites: plantSites,
    key_rounds: keyRounds,
    notes: (match.notes as string | null) ?? null,
    player_stats: playerStats.map(p => ({
      ign: p.ign, agent: p.agent,
      kda: `${p.kills}/${p.deaths}/${p.assists}`,
      acs: p.acs, hs_pct: p.hs_pct,
      first_bloods: p.first_bloods, first_deaths: p.first_deaths,
    })),
  }

  return `## 試合データ
${JSON.stringify(input, null, 2)}

上記データを使い、7ステップ分析フレームワークに従って submit_analysis ツールを呼び出すこと。

分析の軸：
1. intent_assessment — チームが何を狙ったかを「結果からではなく構造から」推測する
2. ev_evaluation — その判断が合理的だったかを数値で評価する（verdict: rational/irrational/situational）
3. breakdown_points — 勝負が決まったラウンドとタイミングを最大3件特定する
4. cause_analysis — 問題を structural/execution/judgment/information の4種類に分類する
5. reproducibility — この結果が再現可能か偶然かを判定する（verdict: repeatable/coincidence/mixed）
6. improvements — who/when/what/why の4軸で改善策を具体化する（最大4件）
7. rules — 改善をif-then形式のチームルールに変換する

禁止：抽象論・精神論・結果論・数値なし根拠`
}

export function buildCoachPrompt(context: Record<string, unknown>): string {
  return `あなたはVALORANTプロチームのヘッドコーチ兼アナリストです。
T1、Sentinels、FNATICなどのトップチームのコーチング手法を理解しており、
データから戦術的洞察を導き出す専門家です。

## 分析原則
- 感情ではなく数値ベースで判断する
- 「なぜ負けたか」の根本原因を特定する
- すぐに実行可能な改善策を提示する
- 選手個人のメンタルを傷つけず、課題を明確に伝える

## チームデータ

### 全体勝率（マップ別）
${JSON.stringify(context.team_win_rates, null, 2)}

### エコノミー別勝率
${JSON.stringify(context.economy_win_rates, null, 2)}

### ファーストブラッド影響分析
${JSON.stringify(context.first_blood_impact, null, 2)}

### サイト別勝率
${JSON.stringify(context.site_win_rates, null, 2)}

### ラウンド番号別勝率
${JSON.stringify(context.round_win_rates, null, 2)}

### プレイヤースタッツ
${JSON.stringify(context.player_stats, null, 2)}

${context.match_data ? `### 直近マッチ詳細\n${JSON.stringify(context.match_data, null, 2)}` : ''}

## 出力形式（必ずこのJSON形式で返すこと）

\`\`\`json
{
  "loss_reasons": [
    {
      "factor": "問題の要因名",
      "severity": "critical|high|medium|low",
      "win_rate_impact": -0.xx,
      "evidence": "具体的な数値を引用した根拠",
      "rounds_affected": 数値
    }
  ],
  "win_patterns": [
    {
      "pattern": "勝ちパターン名",
      "frequency": 0.xx,
      "win_rate": 0.xx,
      "description": "パターンの詳細説明"
    }
  ],
  "improvements": [
    {
      "area": "attack|defense|economy|individual|utility|communication",
      "action": "具体的な改善アクション",
      "priority": "immediate|this_week|next_month",
      "drill": "練習メニュー（任意）"
    }
  ],
  "player_feedback": [
    {
      "player_id": "UUID",
      "ign": "ゲーム内名前",
      "role": "役割",
      "performance_grade": "S|A|B|C|D",
      "strengths": ["強み1", "強み2"],
      "weaknesses": ["課題1", "課題2"],
      "actions": ["今週やること1", "今週やること2"],
      "role_fit_score": 0-100
    }
  ],
  "executive_summary": "コーチとしての総括（3-5文）",
  "priority_this_week": "今週最優先で取り組むべき1つの課題"
}
\`\`\`

## 分析の重要ポイント

1. **勝率に直結する因子を優先**する。データが示す最も影響の大きい問題から着手せよ。
2. **FBとFDの非対称性**を必ず分析すること。FB獲得時とFD発生時の勝率差が大きければ、エントリー選手の評価が鍵。
3. **エコノミー管理の失敗**はピストルラウンドとフォースバイ判断に現れる。
4. **サイトリテイク失敗**はディフェンス崩壊の主因であることが多い。
5. **ラウンド1,2,3勝率**の低さはエコノミーサイクルの問題を示す。

厳しく、しかし建設的に。プロコーチとして回答せよ。`
}

export function buildPlayerAnalysisPrompt(
  player: Record<string, unknown>,
  teamContext: Record<string, unknown>
): string {
  return `あなたはVALORANT個人コーチです。以下の選手データを分析し、
具体的で実行可能なフィードバックを提供してください。

## 選手情報
IGN: ${player.ign}
ロール: ${player.role}
主要エージェント: ${JSON.stringify(player.agent_pool)}

## スタッツ（直近）
${JSON.stringify(player, null, 2)}

## チーム全体の文脈
${JSON.stringify(teamContext, null, 2)}

## 分析してほしいこと

1. **パフォーマンス評価**
   - このロールとして期待値に対してどの程度か
   - 特に際立つ強みと課題

2. **ロール適正**
   - 現在のロールへの適性（0-100）
   - 別ロールの方が活きる可能性

3. **ファーストブラッド分析**
   - エントリー選手として機能しているか

4. **改善アクション**（最大3つ、具体的に）
   - 練習内容
   - ゲームプレイ上の意思決定改善点

プロコーチとして率直に回答せよ。数値を必ず引用すること。`
}

export function buildTacticalAnalysisPrompt(
  mapName: string,
  rounds: Record<string, unknown>[],
  winRate: number
): string {
  return `VALORANTの戦術アナリストとして、${mapName}でのパフォーマンスを分析してください。

## マップ全体勝率: ${(winRate * 100).toFixed(1)}%

## ラウンド詳細
${JSON.stringify(rounds.slice(0, 30), null, 2)}

## 分析要求

1. **攻め・守りの強度差**
   - どちらのサイドが弱いか、なぜか

2. **プラント戦略**
   - サイト選択の偏りと有効性
   - プラント後の勝率

3. **ユーティリティ使用パターン**
   - ラウンドタイム（plant_time_sec）からわかること

4. **ラウンド3の問題**
   - ピストルラウンド結果がエコサイクルに与える影響

5. **このマップでの戦術的優先提案**（3つ）

データ駆動で、具体的に回答せよ。`
}

export function buildMatchFeedbackPrompt(
  match: Record<string, unknown>,
  rounds: Record<string, unknown>[],
  playerStats: Record<string, unknown>[],
  styleTag: string
): string {
  const atkRounds = rounds.filter(r => r.side === 'attack')
  const defRounds = rounds.filter(r => r.side === 'defense')
  const atkWins = atkRounds.filter(r => r.result === 'win').length
  const defWins = defRounds.filter(r => r.result === 'win').length
  const plantedRounds = rounds.filter(r => r.planted === true)
  const postPlantWins = plantedRounds.filter(r => r.result === 'win').length

  const stats = {
    map: match.map,
    result: match.result,
    score: `${match.team_score} - ${match.opponent_score}`,
    opponent: match.opponent_name,
    atk_win_rate: atkRounds.length > 0
      ? `${atkWins}/${atkRounds.length} (${Math.round(atkWins / atkRounds.length * 100)}%)`
      : 'なし',
    def_win_rate: defRounds.length > 0
      ? `${defWins}/${defRounds.length} (${Math.round(defWins / defRounds.length * 100)}%)`
      : 'なし',
    post_plant_win_rate: plantedRounds.length > 0
      ? `${postPlantWins}/${plantedRounds.length} (${Math.round(postPlantWins / plantedRounds.length * 100)}%)`
      : 'なし',
    estimated_style: styleTag,
  }

  return `あなたはVALORANTのプロコーチです。1試合のデータを分析してフィードバックを生成してください。

## 試合データ
${JSON.stringify(stats, null, 2)}

## ラウンド詳細
${JSON.stringify(rounds, null, 2)}

## 選手スタッツ
${JSON.stringify(playerStats, null, 2)}

## フィードバック生成ルール
- 具体的な行動で書く（「守りが弱い」→「Bサイトでリテイクの入りが遅い」）
- 数値を1つ以上引用する
- 改善アクションは次の試合で実行できる行動として書く
- 日本語で回答すること

以下のJSON形式のみで出力すること。余分なテキスト禁止。

\`\`\`json
{
  "summary": "この試合の総括（2〜3文、数値を引用すること）",
  "strengths": [
    "具体的な良かった点1",
    "具体的な良かった点2"
  ],
  "weaknesses": [
    "具体的な課題1（行動として）",
    "具体的な課題2（行動として）"
  ],
  "action_items": [
    "次の試合で実行するアクション1（動詞で始める）",
    "次の試合で実行するアクション2",
    "次の試合で実行するアクション3"
  ],
  "style_tag": "${styleTag}"
}
\`\`\`
`
}

export function buildCoachPromptV2(context: Record<string, unknown>): string {
  const filterInfo = context.filter_info as Record<string, unknown>
  const scope = filterInfo?.map_filter
    ? `マップ「${filterInfo.map_filter}」のデータ`
    : filterInfo?.match_ids_provided
    ? `選択された ${filterInfo.match_count} 試合のデータ`
    : '全試合データ'

  return `## 分析対象
${scope}（${filterInfo?.match_count}試合）

## チームデータ
### マップ別勝率
${JSON.stringify(context.win_rates)}
### 試合詳細
${JSON.stringify(context.match_details)}
### ラウンドデータ（サンプル50件）
${JSON.stringify(context.rounds_sample)}
### 選手スタッツ
${JSON.stringify(context.player_stats)}
### エコノミー別勝率
${JSON.stringify(context.economy_stats)}

上記の複数試合データを分析し、以下のJSON形式のみで出力すること。余分なテキスト禁止。日本語で回答すること。

分析の軸：
- 問題は「行動単位」で特定する（「守りが弱い」→「Bサイトでリテイクに入るタイミングが遅い」）
- 数値は根拠として使い、スタッツ羅列は禁止
- 「なぜその行動になるか」まで原因を掘り下げる（判断ミス・情報不足・習慣のいずれか）
- 改善は「次の試合で実行できる行動」まで具体化する
- 禁止：抽象論・精神論・結果論

\`\`\`json
{
  "team_style": {
    "type": "チームタイプ（例：高テンポ×低連携）",
    "win_path": "このチームの勝ち筋（行動単位で）",
    "weakness": "最大の弱点（行動として）"
  },
  "main_issue": {
    "issue": "最重要課題（何をしているか・していないか）",
    "data_evidence": "根拠となる数値1つ",
    "cause": "なぜその行動になるか（判断・習慣・情報の問題）"
  },
  "cause_breakdown": {
    "structural": ["構造問題（戦術・配置・マクロ）"],
    "execution": ["実行問題（撃ち合い・スキル）"],
    "judgment": ["判断問題（ローテ・コール）"],
    "information": ["情報問題（取得不足・誤認識）"]
  },
  "loss_patterns": [
    "行動→結果の形（例：Bサイト展開でユーティリティを温存したまま時間切れになり負ける）"
  ],
  "improvements": [
    {
      "who": "誰が",
      "when": "いつ（状況・フェーズ）",
      "what": "何をする",
      "why": "なぜ（期待値・因果関係）"
    }
  ],
  "rules": [
    "if-then形式のチームルール（例：if エコラウンドでフォースが過半数同意なら全員エコにする）"
  ],
  "player_feedback": [
    {
      "name": "プレイヤー名",
      "problem": "何をしているか（行動として）",
      "improvement": "次の試合でこう変える（行動として）",
      "why": "なぜこれが優先されるか"
    }
  ],
  "next_actions": [
    "次の試合で実行する行動（動詞で始める）"
  ],
  "summary": "コーチ視点の総評（1〜2行、納得感を重視）"
}
\`\`\`
`
}
