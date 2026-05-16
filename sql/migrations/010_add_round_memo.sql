-- Add memo column to rounds for per-round coach notes
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS memo TEXT;
