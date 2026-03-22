"""
VALORANT AI Coach - Python Entry Point
Next.js API から呼び出される分析エンジン。
スタンドアロンでも動作する。
"""
from __future__ import annotations

import json
import os
import sys
import re
from typing import Optional

import anthropic

# Import analyzer
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from analyzers.stats_analyzer import TeamAnalyzer


SYSTEM_PROMPT = """あなたはVALORANTプロチームのヘッドコーチ兼アナリストです。
T1、Sentinels、FNATICなどのトップチームのコーチング手法を理解しており、
データから戦術的洞察を導き出す専門家です。

コーチング原則:
1. 感情ではなくデータに基づいて判断する
2. 「なぜ負けたか」の根本原因を特定する
3. すぐ実行可能な具体的改善策を提示する
4. 選手個人を批判せず、課題とアクションを明確に伝える
5. 優先度をつけて提示する（すべてを同時に直そうとしない）"""


def build_analysis_prompt(stats_report: dict) -> str:
    return f"""以下のチームデータを分析し、コーチとして詳細なフィードバックを提供してください。

## データサマリー
- 試合数: {stats_report['data_summary']['total_matches']}
- ラウンド数: {stats_report['data_summary']['total_rounds']}
- 追跡選手: {stats_report['data_summary']['players_tracked']}

## ファーストブラッド分析
{json.dumps(stats_report['first_blood_analysis'], ensure_ascii=False, indent=2)}

## エコノミー分析
{json.dumps(stats_report['economy_analysis'], ensure_ascii=False, indent=2)}

## サイド分析（攻め/守り）
{json.dumps(stats_report['side_analysis'], ensure_ascii=False, indent=2)}

## ラウンド進行（1〜n）
{json.dumps(stats_report['round_progression'][:10], ensure_ascii=False, indent=2)}

## プレイヤーインパクト
{json.dumps(stats_report['player_impact'], ensure_ascii=False, indent=2)}

## 自動検出された問題
{json.dumps(stats_report['critical_issues'], ensure_ascii=False, indent=2)}

---

以下の形式のJSONで回答してください：

```json
{{
  "loss_reasons": [
    {{
      "factor": "問題名",
      "severity": "critical|high|medium|low",
      "win_rate_impact": -0.xx,
      "evidence": "具体的な数値を引用した証拠",
      "rounds_affected": 数値
    }}
  ],
  "win_patterns": [
    {{
      "pattern": "勝ちパターン名",
      "frequency": 0.xx,
      "win_rate": 0.xx,
      "description": "説明"
    }}
  ],
  "improvements": [
    {{
      "area": "attack|defense|economy|individual|utility|communication",
      "action": "具体的なアクション",
      "priority": "immediate|this_week|next_month",
      "drill": "練習メニュー（任意）"
    }}
  ],
  "player_feedback": [
    {{
      "player_id": "uuid",
      "ign": "ゲーム内名",
      "role": "役割",
      "performance_grade": "S|A|B|C|D",
      "strengths": ["強み"],
      "weaknesses": ["課題"],
      "actions": ["アクション"],
      "role_fit_score": 0-100
    }}
  ],
  "executive_summary": "コーチとしての総括",
  "priority_this_week": "今週最優先課題"
}}
```"""


def run_coaching_session(
    team_id: str,
    match_id: Optional[str] = None,
    output_file: Optional[str] = None,
) -> dict:
    """
    フルコーチングセッションを実行する。
    1. 統計データを取得
    2. Claudeで分析
    3. 構造化レポートを返す
    """
    print(f"[AI Coach] Analyzing team {team_id}...")

    # Step 1: Statistical analysis
    analyzer = TeamAnalyzer(team_id)
    stats_report = analyzer.full_report()

    if stats_report['data_summary']['total_matches'] < 3:
        return {
            "error": "データ不足: 最低3試合のデータが必要です",
            "current_matches": stats_report['data_summary']['total_matches'],
        }

    # Step 2: Claude coaching
    client = anthropic.Anthropic()
    prompt = build_analysis_prompt(stats_report)

    print("[AI Coach] Calling Claude API...")
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    raw_text = message.content[0].text

    # Step 3: Parse JSON
    parsed_report = None
    json_match = re.search(r'```json\n([\s\S]*?)\n```', raw_text)
    if json_match:
        try:
            parsed_report = json.loads(json_match.group(1))
        except json.JSONDecodeError as e:
            print(f"[AI Coach] JSON parse error: {e}")

    result = {
        "team_id": team_id,
        "stats_report": stats_report,
        "coaching_report": parsed_report,
        "raw_analysis": raw_text,
        "model": "claude-sonnet-4-6",
        "tokens_used": {
            "input": message.usage.input_tokens,
            "output": message.usage.output_tokens,
        }
    }

    if output_file:
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2, default=str)
        print(f"[AI Coach] Report saved to {output_file}")

    return result


# ============================================================
# CLI
# ============================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="VALORANT AI Coach")
    parser.add_argument("team_id", help="Team UUID from database")
    parser.add_argument("--match", help="Specific match UUID to analyze")
    parser.add_argument("--output", default="coaching_report.json", help="Output file")
    args = parser.parse_args()

    result = run_coaching_session(
        team_id=args.team_id,
        match_id=args.match,
        output_file=args.output,
    )

    if "error" in result:
        print(f"[Error] {result['error']}")
        sys.exit(1)

    report = result.get("coaching_report", {})
    if report:
        print("\n" + "="*60)
        print("AI COACHING REPORT")
        print("="*60)
        print(f"\n総括: {report.get('executive_summary', 'N/A')}")
        print(f"\n今週の最優先: {report.get('priority_this_week', 'N/A')}")
        print(f"\n敗因 ({len(report.get('loss_reasons', []))}件):")
        for r in report.get("loss_reasons", []):
            print(f"  [{r['severity'].upper()}] {r['factor']}: {r['evidence']}")
        print(f"\n改善提案 ({len(report.get('improvements', []))}件):")
        for imp in report.get("improvements", [])[:5]:
            print(f"  [{imp['priority']}] {imp['action']}")
