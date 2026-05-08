-- Migration 009: Fix role constraint to include sub_duelist and flex
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_role_check;
ALTER TABLE players ADD CONSTRAINT players_role_check
  CHECK (role IN ('duelist','sub_duelist','initiator','controller','sentinel','igl','flex'));
