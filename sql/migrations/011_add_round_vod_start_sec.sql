-- Add per-round VOD start timestamp for video seek in round analysis
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS vod_start_sec INTEGER;
