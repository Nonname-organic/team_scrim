-- Migration 008: Add plan management to user_teams
-- Run on Supabase SQL Editor

ALTER TABLE user_teams
  ADD COLUMN IF NOT EXISTS plan              VARCHAR(20)  DEFAULT 'free'
    CHECK (plan IN ('free','pro','team')),
  ADD COLUMN IF NOT EXISTS ai_usage_count    INTEGER      DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_usage_reset_at TIMESTAMPTZ  DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS stripe_customer_id     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS plan_expires_at         TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_teams_stripe
  ON user_teams(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
