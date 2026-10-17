-- ============================================================
-- 021: ラウンド詳細（主交戦サイト・決着局面・人数状況・交戦位置・敗因タグ）
--
-- 冪等: 何度実行しても結果は同じ（IF NOT EXISTS / 条件付き UPDATE）。
-- 既存の集計（勝率・経済別・FB別・サイト別）が参照する列は値を変えない。
--
-- 用語:
--   plant_site      = 設置サイト（既存列。'M' は廃止、設置なしは planted=false で表す）
--   engagement_site = 主交戦サイト（どこで撃ち合ったか）
--   retake          = 防衛側で相手に設置されたラウンド（= side='defense' AND planted）
--   rotation        = 保存しない導出値（engagement_site と plant_site が異なる A/B/C）
--
-- ロールバック手順（逆順に実行）:
--   UPDATE rounds SET retake = FALSE;  -- 021 以前は retake 列が常に FALSE だった
--   ALTER TABLE rounds DROP CONSTRAINT IF EXISTS rounds_plant_site_check;
--   ALTER TABLE rounds ADD CONSTRAINT rounds_plant_site_check
--     CHECK (plant_site IN ('A','B','C','M')) NOT VALID;
--   DROP TABLE IF EXISTS loss_tags;
--   ALTER TABLE rounds
--     DROP COLUMN IF EXISTS loss_tags,
--     DROP COLUMN IF EXISTS engagement_y,
--     DROP COLUMN IF EXISTS engagement_x,
--     DROP COLUMN IF EXISTS players_at_plant_them,
--     DROP COLUMN IF EXISTS players_at_plant_us,
--     DROP COLUMN IF EXISTS players_after_engagement_them,
--     DROP COLUMN IF EXISTS players_after_engagement_us,
--     DROP COLUMN IF EXISTS decided_phase,
--     DROP COLUMN IF EXISTS engagement_site_source,
--     DROP COLUMN IF EXISTS engagement_site;
-- ============================================================

-- ── 1. ラウンド詳細列（すべて NULL 許容） ──
ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS engagement_site VARCHAR(10)
    CHECK (engagement_site IN ('A','B','C','MID','OUTSIDE','NONE')),
  -- 'inferred' = 021 適用時に旧 plant_site から推定した値
  ADD COLUMN IF NOT EXISTS engagement_site_source VARCHAR(10)
    CHECK (engagement_site_source IN ('input','inferred')),
  ADD COLUMN IF NOT EXISTS decided_phase VARCHAR(12)
    CHECK (decided_phase IN ('PRE_PLANT','POST_PLANT','DEFUSE','TIMEOUT','SAVE')),
  ADD COLUMN IF NOT EXISTS players_after_engagement_us   SMALLINT CHECK (players_after_engagement_us   BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS players_after_engagement_them SMALLINT CHECK (players_after_engagement_them BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS players_at_plant_us           SMALLINT CHECK (players_at_plant_us           BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS players_at_plant_them         SMALLINT CHECK (players_at_plant_them         BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS engagement_x FLOAT,
  ADD COLUMN IF NOT EXISTS engagement_y FLOAT,
  -- loss_tags.id の配列（タグ名の変更が過去ラウンドにも反映されるよう ID で持つ）
  ADD COLUMN IF NOT EXISTS loss_tags UUID[] NOT NULL DEFAULT '{}';

-- ── 2. 設置サイトから 'M' を除外（既存行は検証しない） ──
ALTER TABLE rounds DROP CONSTRAINT IF EXISTS rounds_plant_site_check;
ALTER TABLE rounds ADD CONSTRAINT rounds_plant_site_check
  CHECK (plant_site IN ('A','B','C')) NOT VALID;

-- ── 3. 敗因タグマスタ（チームごと。初期タグは API 初回取得時に投入） ──
CREATE TABLE IF NOT EXISTS loss_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name        VARCHAR(40) NOT NULL,
  -- 初期タグの識別子（表示名を翻訳するため）。名前を変更したら NULL にしてカスタム扱い
  preset_key  VARCHAR(40),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, name)
);
CREATE INDEX IF NOT EXISTS idx_loss_tags_team ON loss_tags(team_id, sort_order);

ALTER TABLE loss_tags ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'loss_tags' AND policyname = 'own_team_loss_tags') THEN
    CREATE POLICY "own_team_loss_tags" ON loss_tags
      FOR ALL USING (team_id IN (SELECT team_id FROM user_teams WHERE user_id = auth.uid()));
  END IF;
END $$;

-- ── 4. 既存データの補完 ──
-- retake: 従来は「防衛側の planted=true」がリテイクを表していた（retake 列は未保存で常に FALSE）
UPDATE rounds SET retake = (side = 'defense' AND planted)
 WHERE retake IS DISTINCT FROM (side = 'defense' AND planted);

-- engagement_site: 初回適用時のみ旧 plant_site で埋めて 'inferred' を付ける。
-- 2回目以降は新規入力（engagement_site_source が入った行）があるのでスキップされる
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM rounds WHERE engagement_site_source IS NOT NULL) THEN
    UPDATE rounds SET engagement_site = plant_site, engagement_site_source = 'inferred'
     WHERE engagement_site IS NULL AND plant_site IN ('A','B','C');
  END IF;
END $$;
