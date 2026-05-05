-- Migration 006: Add 'flex' to players role constraint
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_role_check;
ALTER TABLE players ADD CONSTRAINT players_role_check
  CHECK (role IN ('duelist','initiator','controller','sentinel','igl','flex'));
