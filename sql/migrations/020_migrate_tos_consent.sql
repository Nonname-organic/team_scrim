-- Migration 020: Migrate tos_agreed_at → user_consents, drop old column
-- Run AFTER 018 and 019

-- 既存ユーザー（tos_agreed_at 設定済み）を全ポリシー v1.0 に一括同意済みとして移行
INSERT INTO user_consents (user_id, policy_type, version, consented_at, ip_address, user_agent)
SELECT
  ut.user_id,
  pt.policy_type,
  '1.0',
  ut.tos_agreed_at,
  NULL,
  NULL
FROM user_teams ut
CROSS JOIN (VALUES ('terms'), ('data_policy'), ('privacy'), ('security')) AS pt(policy_type)
WHERE ut.tos_agreed_at IS NOT NULL
ON CONFLICT (user_id, policy_type, version) DO NOTHING;

-- 旧カラムを削除
ALTER TABLE user_teams DROP COLUMN IF EXISTS tos_agreed_at;
