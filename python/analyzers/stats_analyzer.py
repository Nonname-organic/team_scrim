"""
VALORANT Scrim Analyzer - Stats Analysis Engine
勝率に影響する因子の統計分析
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, asdict
from typing import Optional
import pandas as pd
import numpy as np
import psycopg2
from psycopg2.extras import RealDictCursor
from scipy import stats as scipy_stats


# ============================================================
# DB connection
# ============================================================

def get_conn():
    return psycopg2.connect(
        os.environ["DATABASE_URL"],
        cursor_factory=RealDictCursor
    )


# ============================================================
# Data loading helpers
# ============================================================

def load_matches(team_id: str) -> pd.DataFrame:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT m.*,
                       ts.fb_round_wins,   ts.fb_round_total,
                       ts.fd_round_wins,   ts.fd_round_total,
                       ts.post_plant_wins, ts.post_plant_total,
                       ts.eco_wins,        ts.eco_total,
                       ts.full_buy_wins,   ts.full_buy_total,
                       ts.pistol_wins,     ts.pistol_total
                FROM matches m
                LEFT JOIN team_stats ts
                       ON ts.match_id = m.id AND ts.team_id = m.team_id
                WHERE m.team_id = %s
                ORDER BY m.match_date
            """, (team_id,))
            return pd.DataFrame(cur.fetchall())


def load_rounds(team_id: str, map_name: Optional[str] = None) -> pd.DataFrame:
    with get_conn() as conn:
        with conn.cursor() as cur:
            q = """
                SELECT r.*, m.map, m.team_id
                FROM rounds r
                JOIN matches m ON m.id = r.match_id
                WHERE m.team_id = %s
            """
            params = [team_id]
            if map_name:
                q += " AND m.map = %s"
                params.append(map_name)
            cur.execute(q, params)
            return pd.DataFrame(cur.fetchall())


def load_player_stats(team_id: str) -> pd.DataFrame:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT ps.*, p.ign, p.role, m.map, m.match_date, m.result
                FROM player_stats ps
                JOIN players p ON p.id = ps.player_id
                JOIN matches m ON m.id = ps.match_id
                WHERE p.team_id = %s
                ORDER BY m.match_date
            """, (team_id,))
            return pd.DataFrame(cur.fetchall())


# ============================================================
# Core Analysis
# ============================================================

@dataclass
class WinFactorResult:
    factor: str
    win_rate_with: float
    win_rate_without: float
    win_rate_delta: float
    sample_size: int
    p_value: float
    is_significant: bool
    severity: str  # critical / high / medium / low

    def to_dict(self):
        return asdict(self)


class TeamAnalyzer:
    """チーム勝率因子分析エンジン"""

    def __init__(self, team_id: str):
        self.team_id = team_id
        self.matches_df = load_matches(team_id)
        self.rounds_df  = load_rounds(team_id)
        self.player_df  = load_player_stats(team_id)

    # ----------------------------------------------------------
    # 1. ファーストブラッド影響
    # ----------------------------------------------------------
    def analyze_firstblood_impact(self) -> dict:
        r = self.rounds_df.dropna(subset=['first_blood_team'])
        if r.empty:
            return {}

        fb_win  = r[r.first_blood_team == True]['result'].eq('win').mean()
        fd_win  = r[r.first_blood_team == False]['result'].eq('win').mean()
        delta   = fb_win - fd_win

        # Chi-square test
        ct = pd.crosstab(r.first_blood_team, r['result'].eq('win'))
        chi2, p, *_ = scipy_stats.chi2_contingency(ct)

        return {
            "fb_win_rate":  round(float(fb_win), 3),
            "fd_win_rate":  round(float(fd_win), 3),
            "delta":        round(float(delta), 3),
            "significance": round(float(p), 4),
            "is_significant": bool(p < 0.05),
            "rounds_analyzed": int(len(r)),
            "interpretation": (
                f"FB取得時の勝率({fb_win:.1%})はFD発生時({fd_win:.1%})より"
                f"{delta:.1%}高い。{'統計的に有意。' if p < 0.05 else '（サンプル不足）'}"
            )
        }

    # ----------------------------------------------------------
    # 2. エコノミー分析
    # ----------------------------------------------------------
    def analyze_economy(self) -> list[dict]:
        r = self.rounds_df.dropna(subset=['economy_type'])
        results = []

        ideal = {
            'pistol': 0.50, 'eco': 0.20, 'semi_eco': 0.35,
            'semi_buy': 0.45, 'full_buy': 0.60, 'force': 0.35,
        }

        for eco_type, group in r.groupby('economy_type'):
            wr = group['result'].eq('win').mean()
            base = ideal.get(eco_type, 0.5)
            delta = wr - base

            results.append({
                "economy_type": eco_type,
                "win_rate": round(float(wr), 3),
                "baseline": base,
                "delta_from_baseline": round(float(delta), 3),
                "rounds": len(group),
                "concern": delta < -0.10,
            })

        return sorted(results, key=lambda x: x['delta_from_baseline'])

    # ----------------------------------------------------------
    # 3. サイド分析
    # ----------------------------------------------------------
    def analyze_sides(self, map_name: Optional[str] = None) -> dict:
        m = self.matches_df
        if map_name:
            m = m[m.map == map_name]

        if m.empty:
            return {}

        atk = m[m.attack_rounds_played > 0]
        def_ = m[m.defense_rounds_played > 0]

        atk_wr = (atk.attack_rounds_won / atk.attack_rounds_played).mean() if len(atk) else None
        def_wr = (def_.defense_rounds_won / def_.defense_rounds_played).mean() if len(def_) else None

        return {
            "attack_win_rate":  round(float(atk_wr), 3) if atk_wr is not None else None,
            "defense_win_rate": round(float(def_wr), 3) if def_wr is not None else None,
            "weaker_side": "attack" if (atk_wr or 0.5) < (def_wr or 0.5) else "defense",
            "matches": len(m),
        }

    # ----------------------------------------------------------
    # 4. ラウンドN勝率（ピストル→エコサイクル）
    # ----------------------------------------------------------
    def analyze_round_progression(self) -> list[dict]:
        r = self.rounds_df
        results = []
        for rn, group in r.groupby('round_number'):
            wr = group['result'].eq('win').mean()
            results.append({
                "round_number": int(rn),
                "win_rate": round(float(wr), 3),
                "rounds": len(group),
                "is_pistol": rn in [1, 13],
            })
        return sorted(results, key=lambda x: x['round_number'])

    # ----------------------------------------------------------
    # 5. プレイヤー貢献度
    # ----------------------------------------------------------
    def analyze_player_impact(self) -> list[dict]:
        p = self.player_df
        if p.empty:
            return []

        results = []
        for player_id, group in p.groupby('player_id'):
            ign = group['ign'].iloc[0]
            role = group['role'].iloc[0]

            # Win correlation
            win_corr = None
            if 'result' in group.columns and len(group) >= 5:
                win_arr = group['result'].eq('win').astype(int)
                acs_arr = group['acs'].fillna(0)
                if acs_arr.std() > 0:
                    win_corr = float(np.corrcoef(win_arr, acs_arr)[0, 1])

            # FB impact for this player
            fb_rounds = (group['first_bloods'] > 0).sum()
            fd_rounds = (group['first_deaths'] > 0).sum()
            fbsr = group['fbsr'].mean()

            results.append({
                "player_id": str(player_id),
                "ign": ign,
                "role": role,
                "matches": len(group),
                "avg_acs": round(float(group['acs'].mean()), 1),
                "avg_kd":  round(float(group['kd_ratio'].mean()), 3) if 'kd_ratio' in group else None,
                "avg_adr": round(float(group['adr'].mean()), 1),
                "avg_fbsr": round(float(fbsr), 3),
                "total_fb": int(group['first_bloods'].sum()),
                "total_fd": int(group['first_deaths'].sum()),
                "win_acs_correlation": round(win_corr, 3) if win_corr is not None else None,
            })

        return sorted(results, key=lambda x: x['avg_acs'], reverse=True)

    # ----------------------------------------------------------
    # 6. 総合レポート
    # ----------------------------------------------------------
    def full_report(self) -> dict:
        fb = self.analyze_firstblood_impact()
        eco = self.analyze_economy()
        sides = self.analyze_sides()
        rounds = self.analyze_round_progression()
        players = self.analyze_player_impact()

        # Auto-identify critical issues
        issues = []
        if fb.get('delta', 0) > 0.35:
            issues.append({
                "issue": "FB/FD依存度が極めて高い",
                "detail": fb.get('interpretation', ''),
                "priority": "critical",
            })
        for e in eco:
            if e['concern']:
                issues.append({
                    "issue": f"{e['economy_type']}ラウンド勝率が期待値を{abs(e['delta_from_baseline']):.1%}下回る",
                    "detail": f"勝率{e['win_rate']:.1%}（期待値{e['baseline']:.1%}）",
                    "priority": "high" if e['delta_from_baseline'] < -0.15 else "medium",
                })
        if sides.get('attack_win_rate') and sides['attack_win_rate'] < 0.4:
            issues.append({
                "issue": "攻めサイドが著しく弱い",
                "detail": f"攻め勝率{sides['attack_win_rate']:.1%}",
                "priority": "critical",
            })
        if sides.get('defense_win_rate') and sides['defense_win_rate'] < 0.4:
            issues.append({
                "issue": "守りサイドが著しく弱い",
                "detail": f"守り勝率{sides['defense_win_rate']:.1%}",
                "priority": "critical",
            })

        return {
            "team_id": self.team_id,
            "first_blood_analysis": fb,
            "economy_analysis": eco,
            "side_analysis": sides,
            "round_progression": rounds,
            "player_impact": players,
            "critical_issues": issues,
            "data_summary": {
                "total_matches": len(self.matches_df),
                "total_rounds": len(self.rounds_df),
                "players_tracked": len(players),
            }
        }


# ============================================================
# CLI entry point
# ============================================================

if __name__ == "__main__":
    import sys
    team_id = sys.argv[1] if len(sys.argv) > 1 else input("Team ID: ")
    analyzer = TeamAnalyzer(team_id)
    report = analyzer.full_report()
    print(json.dumps(report, ensure_ascii=False, indent=2))
