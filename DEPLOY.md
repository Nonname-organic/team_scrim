# デプロイ手順 — VALORANT Scrim Analyzer

## 前提条件
- Node.js 20+
- Python 3.11+
- PostgreSQL 15+（Railway or Supabase）
- Anthropic API キー

---

## 1. ローカル開発

```bash
# リポジトリをクローン後
cd スクリムデータ解析

# 環境変数
cp .env.example .env.local
# .env.local を編集して DATABASE_URL と ANTHROPIC_API_KEY を設定

# Node.js 依存
npm install

# Python 依存
cd python && pip install -r requirements.txt && cd ..

# DBスキーマ適用
npm run db:push

# 開発サーバー起動
npm run dev
```

ブラウザで http://localhost:3000 を開く。

---

## 2. データベース設定

### Railway（推奨）

1. railway.app にログイン
2. New Project → Add PostgreSQL
3. Variables タブから `DATABASE_URL` をコピー
4. `.env.local` に貼り付け
5. `npm run db:push` でスキーマ適用

---

## 3. チームの初期データ登録

DBに最初のチームとプレイヤーを登録：

```sql
-- チーム作成
INSERT INTO teams (name, tag, region)
VALUES ('MY TEAM', 'MYT', 'JP')
RETURNING id;

-- 返ってきたUUIDを .env.local の NEXT_PUBLIC_DEFAULT_TEAM_ID に設定

-- プレイヤー登録（team_idを置き換え）
INSERT INTO players (team_id, ign, role) VALUES
  ('TEAM-UUID-HERE', 'Player1', 'duelist'),
  ('TEAM-UUID-HERE', 'Player2', 'initiator'),
  ('TEAM-UUID-HERE', 'Player3', 'controller'),
  ('TEAM-UUID-HERE', 'Player4', 'sentinel'),
  ('TEAM-UUID-HERE', 'Player5', 'igl');
```

---

## 4. Vercel デプロイ（フロントエンド）

```bash
# Vercel CLI インストール
npm i -g vercel

# デプロイ
vercel

# 環境変数を Vercel に設定
vercel env add DATABASE_URL
vercel env add ANTHROPIC_API_KEY
vercel env add NEXT_PUBLIC_DEFAULT_TEAM_ID
```

または GitHub に push して Vercel ダッシュボードで連携。

---

## 5. Python解析エンジン（オプション）

Next.js API Routes が主要エンドポイントを担う。
Python は追加の高度分析が必要な場合に使用：

```bash
# スタッツ分析（CLIから実行）
cd python
python analyzers/stats_analyzer.py <589dd83f-d6ad-4710-8456-b2db07c5c4fe>

# AIコーチレポート生成
python ai/coach.py <TEAM_UUID> --output report.json

# 動画解析
python analyzers/video_analyzer.py path/to/match.mp4 events.json
```

### Python を API として起動する場合（FastAPI）

```bash
cd python
uvicorn api.main:app --reload --port 8001
```

---

## 6. 動画解析の追加設定

### Tesseract OCR インストール

**Windows:**
```
winget install UB-Mannheim.TesseractOCR
---

## 7. 本番チェックリスト

- [ ] DATABASE_URL は SSL有効のURL（Railway/Supabase自動対応）
- [ ] ANTHROPIC_API_KEY の使用量上限を設定（Anthropic Console）
- [ ] Vercel の Function Timeout を60秒に設定（AI分析用）
- [ ] `public/uploads/` フォルダのパーミッション確認
- [ ] Rate limiting の実装（本番用）

---

## アーキテクチャ図

```
Browser
  ↓
Vercel (Next.js)
  ├── /api/matches     → PostgreSQL (Railway)
  ├── /api/players     → PostgreSQL
  ├── /api/analysis    → PostgreSQL (集計クエリ)
  ├── /api/ai/analyze  → Anthropic Claude API
  └── /api/ocr         → Anthropic Claude Vision

Python (ローカル or Railway Worker)
  ├── stats_analyzer.py  → PostgreSQL → 統計分析
  ├── video_analyzer.py  → 動画ファイル → イベント抽出
  └── coach.py           → Anthropic Claude → コーチングレポート
```

---

## データフロー

```
スクリム終了
    ↓
[スコアボード画像] → /api/ocr → Claude Vision → スタッツ自動入力
    ↓
[手動補正 UI] → /api/players/[id]/stats → PostgreSQL
    ↓
[試合動画] → video_analyzer.py → イベント抽出 → PostgreSQL
    ↓
/api/ai/analyze → 統計分析 + Claude → AIコーチレポート
    ↓
ダッシュボード表示（勝率・課題・改善案）
```
