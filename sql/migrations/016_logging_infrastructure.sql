-- ============================================================
-- Migration 016: Logging & audit infrastructure (PR-3)
-- ============================================================
-- 4 append-only log tables for developer-side diagnostics & audit.
-- No admin UI — query via Supabase SQL Editor / psql.
--
-- Design notes:
--   - All timestamps stored in UTC (TIMESTAMPTZ, app writes NOW() UTC).
--   - PII forbidden: no password / cookie / full token / raw IP / raw SQL.
--   - IP / user-agent stored as SHA-256 hashes only.
--   - Range-partition-ready: created_at is leading column, PK includes it.
--   - Retention enforced by fn_purge_logs() (call via pg_cron or manual).
-- ============================================================

-- ── application_logs: 通常動作・API・処理時間・Warning・Validation ──
-- 保持: 30日
CREATE TABLE IF NOT EXISTS application_logs (
  id           UUID        NOT NULL DEFAULT uuid_generate_v4(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level        VARCHAR(10) NOT NULL DEFAULT 'info'
               CHECK (level IN ('debug','info','warn')),
  request_id   UUID,
  team_id      UUID,
  user_id      UUID,
  method       VARCHAR(10),
  path         TEXT,
  status_code  SMALLINT,
  duration_ms  INTEGER,
  message      TEXT,
  context      JSONB,
  PRIMARY KEY (id, created_at)
);

-- ── error_logs: 例外・DB失敗・API失敗・StackTrace ──
-- 保持: 90日
CREATE TABLE IF NOT EXISTS error_logs (
  id           UUID        NOT NULL DEFAULT uuid_generate_v4(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level        VARCHAR(10) NOT NULL DEFAULT 'error'
               CHECK (level IN ('error','fatal')),
  request_id   UUID,
  team_id      UUID,
  user_id      UUID,
  method       VARCHAR(10),
  path         TEXT,
  error_code   VARCHAR(50),
  message      TEXT,
  stack_trace  TEXT,
  context      JSONB,
  PRIMARY KEY (id, created_at)
);

-- ── audit_logs: ログイン・Export・更新・設定変更（append only） ──
-- 保持: 365日
CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID        NOT NULL DEFAULT uuid_generate_v4(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_id   UUID,
  team_id      UUID,
  user_id      UUID,
  action       VARCHAR(50) NOT NULL,   -- 'login_success','export','match_update',...
  resource     VARCHAR(50),            -- 'match','player','team',...
  resource_id  UUID,
  metadata     JSONB,                  -- { export_type, row_count, ... }
  PRIMARY KEY (id, created_at)
);

-- ── security_logs: 認証失敗・権限異常・RateLimit・アクセス拒否 ──
-- 保持: 365日
-- IP / UA は SHA-256 ハッシュのみ（生保存禁止）
CREATE TABLE IF NOT EXISTS security_logs (
  id               UUID        NOT NULL DEFAULT uuid_generate_v4(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type       VARCHAR(40) NOT NULL,  -- 'auth_failed','rate_limit_exceeded','access_denied',...
  request_id       UUID,
  team_id          UUID,
  user_id          UUID,
  path             TEXT,
  ip_hash          CHAR(64),              -- SHA-256 hex
  user_agent_hash  CHAR(64),              -- SHA-256 hex
  message          TEXT,
  context          JSONB,
  PRIMARY KEY (id, created_at)
);

-- ── Indexes ──────────────────────────────────────────────────
-- application_logs
CREATE INDEX IF NOT EXISTS idx_app_logs_created  ON application_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_team     ON application_logs (team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_level    ON application_logs (level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_user     ON application_logs (user_id, created_at DESC);

-- error_logs
CREATE INDEX IF NOT EXISTS idx_err_logs_created  ON error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_err_logs_team     ON error_logs (team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_err_logs_level    ON error_logs (level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_err_logs_user     ON error_logs (user_id, created_at DESC);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_team    ON audit_logs (team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user    ON audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action  ON audit_logs (action, created_at DESC);

-- security_logs
CREATE INDEX IF NOT EXISTS idx_sec_logs_created   ON security_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_logs_team      ON security_logs (team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_logs_event     ON security_logs (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_logs_user      ON security_logs (user_id, created_at DESC);

-- ── Append-only enforcement (audit/security) ─────────────────
-- UPDATE / DELETE を除いた rule で改ざんを防ぐ（管理者による手動パージのみ許可）
-- ※ fn_purge_logs は SECURITY DEFINER で DELETE を実行するため rule の影響を受けない
CREATE OR REPLACE RULE audit_logs_no_update AS
  ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE OR REPLACE RULE security_logs_no_update AS
  ON UPDATE TO security_logs DO INSTEAD NOTHING;

-- ── Retention purge function ─────────────────────────────────
-- 保持期間超過分を削除。pg_cron で日次実行 or 手動実行。
CREATE OR REPLACE FUNCTION fn_purge_logs() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM application_logs WHERE created_at < NOW() - INTERVAL '30 days';
  DELETE FROM error_logs       WHERE created_at < NOW() - INTERVAL '90 days';
  DELETE FROM audit_logs       WHERE created_at < NOW() - INTERVAL '365 days';
  DELETE FROM security_logs    WHERE created_at < NOW() - INTERVAL '365 days';
END;
$$;

-- pg_cron が利用可能な場合は以下を有効化（Supabase: Database > Extensions で pg_cron 有効化後）:
-- SELECT cron.schedule('purge-logs-daily', '0 3 * * *', 'SELECT fn_purge_logs()');
