-- ============================================================
-- Migration 017: Consent management (PR-5)
-- ============================================================
-- 利用規約・ポリシーの同意履歴とバージョン管理。
-- 次回ログイン時のセッション確立後に未同意を検知しブロックする方式。
-- 「規約更新時のみ再同意」= 有効な最新 version に未同意なら再要求。
-- ============================================================

-- ── policy_versions: 各ポリシーのバージョン定義 ──
CREATE TABLE IF NOT EXISTS policy_versions (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  type         VARCHAR(30) NOT NULL,   -- 'terms' | 'privacy' | 'data_usage' | 'security'
  version      VARCHAR(10) NOT NULL,   -- '1.0', '1.1', ...
  content_hash TEXT,                   -- ページ本文のハッシュ（改訂検知の補助）
  effective_at TIMESTAMPTZ NOT NULL,   -- この日時以降に有効
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (type, version)
);

CREATE INDEX IF NOT EXISTS idx_policy_versions_type
  ON policy_versions (type, effective_at DESC);

-- ── user_consents: ユーザーの同意履歴（追記のみ） ──
-- IP / UA は SHA-256 ハッシュのみ保存（生保存禁止・ログ方針に統一）
CREATE TABLE IF NOT EXISTS user_consents (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_type     VARCHAR(30) NOT NULL,
  version         VARCHAR(10) NOT NULL,
  consented_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash         CHAR(64),
  user_agent_hash CHAR(64),
  revoked_at      TIMESTAMPTZ,
  UNIQUE (user_id, policy_type, version)
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user
  ON user_consents (user_id, policy_type);

-- ── 現行ポリシーの初期バージョン投入 ──
-- 既存ページ /terms /privacy の「最終更新日 2026-06-24」に対応。
INSERT INTO policy_versions (type, version, effective_at) VALUES
  ('terms',   '1.0', '2026-06-24T00:00:00+09:00'),
  ('privacy', '1.0', '2026-06-24T00:00:00+09:00')
ON CONFLICT (type, version) DO NOTHING;
