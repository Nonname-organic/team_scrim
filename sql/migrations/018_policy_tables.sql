-- Migration 018: Policy version management + user consent tracking
-- Replaces user_teams.tos_agreed_at (see migration 020)

-- ── policy_versions: Markdown本文を版管理 ──────────────────────
CREATE TABLE IF NOT EXISTS policy_versions (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_type    VARCHAR(30) NOT NULL
                 CHECK (policy_type IN ('terms', 'data_policy', 'privacy', 'security')),
  version        VARCHAR(10) NOT NULL,
  title          VARCHAR(200) NOT NULL,
  content        TEXT        NOT NULL,  -- Markdown
  effective_date DATE        NOT NULL,
  summary        TEXT,                  -- 変更概要（改定履歴表示用）
  published      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (policy_type, version)
);

CREATE INDEX IF NOT EXISTS idx_policy_versions_type_date
  ON policy_versions (policy_type, effective_date DESC, created_at DESC);

-- ── user_consents: ユーザーの同意履歴（法的記録） ────────────────
CREATE TABLE IF NOT EXISTS user_consents (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_type  VARCHAR(30) NOT NULL,
  version      VARCHAR(10) NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address   VARCHAR(45),  -- 法的根拠のため生IPを保存
  user_agent   TEXT,
  UNIQUE (user_id, policy_type, version)
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user
  ON user_consents (user_id, policy_type);
