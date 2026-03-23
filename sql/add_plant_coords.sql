-- Migration: Add plant position coordinates to rounds table
-- Run once against your PostgreSQL database

ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS plant_x FLOAT,
  ADD COLUMN IF NOT EXISTS plant_y FLOAT;
