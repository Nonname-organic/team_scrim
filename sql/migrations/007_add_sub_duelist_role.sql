-- Migration 007: Add 'sub_duelist' role
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_role_check;
ALTER TABLE players ADD CONSTRAINT players_role_check
  CHECK (role IN ('duelist','sub_duelist','initiator','controller','sentinel','flex','igl'));
