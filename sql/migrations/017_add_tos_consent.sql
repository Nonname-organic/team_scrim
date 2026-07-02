-- Migration 017: Add ToS consent tracking to user_teams
ALTER TABLE user_teams ADD COLUMN IF NOT EXISTS tos_agreed_at TIMESTAMPTZ;

-- Grandfather existing users (treat prior registrations as having agreed)
UPDATE user_teams SET tos_agreed_at = created_at WHERE tos_agreed_at IS NULL;
