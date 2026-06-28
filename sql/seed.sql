-- ============================================================
-- Test seed data for local Docker development
-- Team ID matches NEXT_PUBLIC_DEFAULT_TEAM_ID in .env.local
-- ============================================================

-- Team
INSERT INTO teams (id, name, tag, region) VALUES
('f15a5c97-96c6-4450-abbb-c9904ee7dfbb', 'AXELIA', 'AXL', 'JP')
ON CONFLICT (id) DO NOTHING;

-- Players
INSERT INTO players (id, team_id, ign, role, agent_pool, active) VALUES
('a1000000-0000-0000-0000-000000000001', 'f15a5c97-96c6-4450-abbb-c9904ee7dfbb', 'Kinn',    'igl',         ARRAY['Omen','Astra','Viper'],      true),
('a1000000-0000-0000-0000-000000000002', 'f15a5c97-96c6-4450-abbb-c9904ee7dfbb', 'HyperX',  'duelist',     ARRAY['Jett','Neon','Iso'],          true),
('a1000000-0000-0000-0000-000000000003', 'f15a5c97-96c6-4450-abbb-c9904ee7dfbb', 'Nozaki',  'initiator',   ARRAY['Sova','Fade','Skye'],         true),
('a1000000-0000-0000-0000-000000000004', 'f15a5c97-96c6-4450-abbb-c9904ee7dfbb', 'Frost',   'sentinel',    ARRAY['Killjoy','Cypher'],           true),
('a1000000-0000-0000-0000-000000000005', 'f15a5c97-96c6-4450-abbb-c9904ee7dfbb', 'Striker', 'sub_duelist', ARRAY['Reyna','Chamber','Deadlock'], true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Matches
-- ============================================================
INSERT INTO matches (id, team_id, opponent_name, match_date, map, match_type,
  team_score, opponent_score,
  attack_rounds_won, attack_rounds_played,
  defense_rounds_won, defense_rounds_played) VALUES
('b1000000-0000-0000-0000-000000000001', 'f15a5c97-96c6-4450-abbb-c9904ee7dfbb',
  'NORA Gaming', '2026-05-20T19:00:00+09:00', 'Ascent', 'scrim',
  13, 8, 7, 10, 6, 11),
('b1000000-0000-0000-0000-000000000002', 'f15a5c97-96c6-4450-abbb-c9904ee7dfbb',
  'RushFPS',    '2026-05-22T20:00:00+09:00', 'Bind',   'scrim',
  7, 13, 4, 10, 3, 10),
('b1000000-0000-0000-0000-000000000003', 'f15a5c97-96c6-4450-abbb-c9904ee7dfbb',
  'TerrorSquad','2026-05-24T19:30:00+09:00', 'Split',  'scrim',
  13, 11, 6, 12, 7, 12),
('b1000000-0000-0000-0000-000000000004', 'f15a5c97-96c6-4450-abbb-c9904ee7dfbb',
  'NORA Gaming','2026-05-25T20:00:00+09:00', 'Pearl',  'scrim',
  9, 13, 5, 11, 4, 11),
('b1000000-0000-0000-0000-000000000005', 'f15a5c97-96c6-4450-abbb-c9904ee7dfbb',
  'HoloFPS',   '2026-05-27T19:00:00+09:00', 'Sunset', 'scrim',
  13, 5, 8, 9, 5, 9)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Rounds — Match 1: Ascent 13-8 (21 rounds)
-- ============================================================
INSERT INTO rounds (match_id, round_number, side, result, economy_type, planted, plant_site, plant_x, plant_y, retake, contact_timing, notable, first_blood_team, memo) VALUES
('b1000000-0000-0000-0000-000000000001',  1,'attack','win', 'pistol',  true, 'A',0.42,0.30, false,'mid',  false,true,  ''),
('b1000000-0000-0000-0000-000000000001',  2,'attack','win', 'second',  true, 'B',0.65,0.55, false,'late', false,true,  ''),
('b1000000-0000-0000-0000-000000000001',  3,'attack','loss','full_buy', false,null,null,null,false,'early',false,false, ''),
('b1000000-0000-0000-0000-000000000001',  4,'attack','win', 'full_buy', true, 'A',0.44,0.28, false,'mid',  true, true,  'ラッシュ成功'),
('b1000000-0000-0000-0000-000000000001',  5,'attack','loss','semi_buy', false,null,null,null,false,'early',false,false, ''),
('b1000000-0000-0000-0000-000000000001',  6,'attack','win', 'full_buy', true, 'B',0.63,0.57, false,'late', false,true,  ''),
('b1000000-0000-0000-0000-000000000001',  7,'attack','win', 'full_buy', true, 'A',0.41,0.31, false,'mid',  false,true,  ''),
('b1000000-0000-0000-0000-000000000001',  8,'attack','loss','eco',      false,null,null,null,false,'early',false,false, ''),
('b1000000-0000-0000-0000-000000000001',  9,'attack','win', 'full_buy', false,null,null,null,false,'mid',  false,true,  ''),
('b1000000-0000-0000-0000-000000000001', 10,'attack','win', 'full_buy', true, 'A',0.43,0.29, false,'late', false,false, ''),
('b1000000-0000-0000-0000-000000000001', 11,'defense','loss','pistol',  false,null,null,null,false,'early',false,false, ''),
('b1000000-0000-0000-0000-000000000001', 12,'defense','win', 'second',  false,null,null,null,false,'mid',  false,true,  ''),
('b1000000-0000-0000-0000-000000000001', 13,'defense','loss','full_buy', true,'A',0.40,0.32, true, 'late', false,false, 'リテイク失敗'),
('b1000000-0000-0000-0000-000000000001', 14,'defense','win', 'full_buy', false,null,null,null,false,'early',true, true,  'フラッシュ起点のpick'),
('b1000000-0000-0000-0000-000000000001', 15,'defense','win', 'full_buy', false,null,null,null,false,'mid',  false,true,  ''),
('b1000000-0000-0000-0000-000000000001', 16,'defense','loss','semi_buy', true, 'B',0.64,0.56, false,'late', false,false, ''),
('b1000000-0000-0000-0000-000000000001', 17,'defense','loss','full_buy', true, 'A',0.42,0.30, false,'mid',  false,false, ''),
('b1000000-0000-0000-0000-000000000001', 18,'defense','win', 'full_buy', false,null,null,null,false,'early',false,true,  ''),
('b1000000-0000-0000-0000-000000000001', 19,'defense','win', 'full_buy', false,null,null,null,false,'mid',  false,true,  ''),
('b1000000-0000-0000-0000-000000000001', 20,'defense','loss','eco',      false,null,null,null,false,'early',false,false, ''),
('b1000000-0000-0000-0000-000000000001', 21,'defense','win', 'full_buy', false,null,null,null,false,'late', true, true,  '逆転クラッチ');

-- ============================================================
-- Rounds — Match 2: Bind 7-13 (20 rounds)
-- ============================================================
INSERT INTO rounds (match_id, round_number, side, result, economy_type, planted, plant_site, plant_x, plant_y, retake, contact_timing, notable, first_blood_team) VALUES
('b1000000-0000-0000-0000-000000000002',  1,'attack','loss','pistol',  false,null,null,null,false,'early',false,false),
('b1000000-0000-0000-0000-000000000002',  2,'attack','win', 'second',  true, 'B',0.72,0.48, false,'mid',  false,true),
('b1000000-0000-0000-0000-000000000002',  3,'attack','loss','full_buy', false,null,null,null,false,'early',false,false),
('b1000000-0000-0000-0000-000000000002',  4,'attack','win', 'full_buy', true, 'A',0.35,0.62, false,'late', false,true),
('b1000000-0000-0000-0000-000000000002',  5,'attack','loss','eco',      false,null,null,null,false,'early',false,false),
('b1000000-0000-0000-0000-000000000002',  6,'attack','loss','semi_buy', false,null,null,null,false,'mid',  false,false),
('b1000000-0000-0000-0000-000000000002',  7,'attack','win', 'full_buy', true, 'B',0.71,0.47, false,'mid',  true, true),
('b1000000-0000-0000-0000-000000000002',  8,'attack','loss','full_buy', false,null,null,null,false,'early',false,false),
('b1000000-0000-0000-0000-000000000002',  9,'attack','loss','semi_buy', false,null,null,null,false,'mid',  false,false),
('b1000000-0000-0000-0000-000000000002', 10,'attack','win', 'full_buy', true, 'A',0.36,0.63, false,'late', false,true),
('b1000000-0000-0000-0000-000000000002', 11,'defense','loss','pistol',  false,null,null,null,false,'early',false,false),
('b1000000-0000-0000-0000-000000000002', 12,'defense','win', 'second',  false,null,null,null,false,'mid',  false,true),
('b1000000-0000-0000-0000-000000000002', 13,'defense','loss','full_buy', true, 'B',0.70,0.49, false,'late', false,false),
('b1000000-0000-0000-0000-000000000002', 14,'defense','loss','full_buy', true, 'A',0.34,0.61, false,'mid',  false,false),
('b1000000-0000-0000-0000-000000000002', 15,'defense','win', 'full_buy', false,null,null,null,false,'early',false,true),
('b1000000-0000-0000-0000-000000000002', 16,'defense','loss','semi_buy', true, 'B',0.73,0.47, false,'late', true, false),
('b1000000-0000-0000-0000-000000000002', 17,'defense','loss','full_buy', true, 'A',0.35,0.60, false,'mid',  false,false),
('b1000000-0000-0000-0000-000000000002', 18,'defense','loss','full_buy', false,null,null,null,false,'early',false,false),
('b1000000-0000-0000-0000-000000000002', 19,'defense','loss','eco',      false,null,null,null,false,'early',false,false),
('b1000000-0000-0000-0000-000000000002', 20,'defense','loss','full_buy', true, 'B',0.72,0.48, false,'late', false,false);

-- ============================================================
-- Rounds — Match 3: Split 13-11 (24 rounds)
-- ============================================================
INSERT INTO rounds (match_id, round_number, side, result, economy_type, planted, plant_site, plant_x, plant_y, retake, contact_timing, notable, first_blood_team) VALUES
('b1000000-0000-0000-0000-000000000003',  1,'attack','win', 'pistol',  true, 'B',0.55,0.68, false,'mid',  false,true),
('b1000000-0000-0000-0000-000000000003',  2,'attack','loss','second',  false,null,null,null,false,'early',false,false),
('b1000000-0000-0000-0000-000000000003',  3,'attack','win', 'full_buy', true, 'A',0.28,0.42, false,'late', false,true),
('b1000000-0000-0000-0000-000000000003',  4,'attack','loss','eco',      false,null,null,null,false,'early',false,false),
('b1000000-0000-0000-0000-000000000003',  5,'attack','win', 'semi_buy', true, 'B',0.54,0.69, false,'mid',  true, true),
('b1000000-0000-0000-0000-000000000003',  6,'attack','win', 'full_buy', true, 'A',0.27,0.43, false,'late', false,true),
('b1000000-0000-0000-0000-000000000003',  7,'attack','loss','full_buy', false,null,null,null,false,'early',false,false),
('b1000000-0000-0000-0000-000000000003',  8,'attack','loss','semi_buy', false,null,null,null,false,'mid',  false,false),
('b1000000-0000-0000-0000-000000000003',  9,'attack','win', 'full_buy', true, 'B',0.56,0.67, false,'late', false,true),
('b1000000-0000-0000-0000-000000000003', 10,'attack','loss','full_buy', false,null,null,null,false,'early',false,false),
('b1000000-0000-0000-0000-000000000003', 11,'attack','win', 'full_buy', true, 'A',0.29,0.41, false,'mid',  false,true),
('b1000000-0000-0000-0000-000000000003', 12,'attack','loss','eco',      false,null,null,null,false,'early',false,false),
('b1000000-0000-0000-0000-000000000003', 13,'defense','win', 'pistol',  false,null,null,null,false,'mid',  false,true),
('b1000000-0000-0000-0000-000000000003', 14,'defense','loss','second',  true, 'B',0.55,0.68, false,'late', false,false),
('b1000000-0000-0000-0000-000000000003', 15,'defense','win', 'full_buy', false,null,null,null,false,'early',true, true),
('b1000000-0000-0000-0000-000000000003', 16,'defense','loss','full_buy', true, 'A',0.28,0.42, false,'mid',  false,false),
('b1000000-0000-0000-0000-000000000003', 17,'defense','win', 'full_buy', false,null,null,null,false,'early',false,true),
('b1000000-0000-0000-0000-000000000003', 18,'defense','loss','semi_buy', true, 'B',0.54,0.70, false,'late', false,false),
('b1000000-0000-0000-0000-000000000003', 19,'defense','win', 'full_buy', false,null,null,null,false,'mid',  false,true),
('b1000000-0000-0000-0000-000000000003', 20,'defense','loss','full_buy', true, 'A',0.27,0.43, false,'late', false,false),
('b1000000-0000-0000-0000-000000000003', 21,'defense','win', 'full_buy', false,null,null,null,false,'early',false,true),
('b1000000-0000-0000-0000-000000000003', 22,'defense','loss','eco',      false,null,null,null,false,'early',false,false),
('b1000000-0000-0000-0000-000000000003', 23,'defense','win', 'full_buy', false,null,null,null,false,'mid',  true, true),
('b1000000-0000-0000-0000-000000000003', 24,'defense','win', 'full_buy', false,null,null,null,false,'late', false,true);

-- ============================================================
-- Rounds — Match 4: Pearl 9-13 (22 rounds)
-- ============================================================
INSERT INTO rounds (match_id, round_number, side, result, economy_type, planted, plant_site, plant_x, plant_y, retake, contact_timing, notable, first_blood_team) VALUES
('b1000000-0000-0000-0000-000000000004',  1,'attack','loss','pistol',  false,null,null,null,false,'early',false,false),
('b1000000-0000-0000-0000-000000000004',  2,'attack','win', 'second',  true, 'A',0.38,0.45, false,'mid',  false,true),
('b1000000-0000-0000-0000-000000000004',  3,'attack','loss','full_buy', false,null,null,null,false,'early',false,false),
('b1000000-0000-0000-0000-000000000004',  4,'attack','win', 'full_buy', true, 'B',0.62,0.52, false,'late', true, true),
('b1000000-0000-0000-0000-000000000004',  5,'attack','loss','eco',      false,null,null,null,false,'early',false,false),
('b1000000-0000-0000-0000-000000000004',  6,'attack','win', 'semi_buy', true, 'A',0.37,0.46, false,'mid',  false,true),
('b1000000-0000-0000-0000-000000000004',  7,'attack','loss','full_buy', false,null,null,null,false,'early',false,false),
('b1000000-0000-0000-0000-000000000004',  8,'attack','loss','full_buy', false,null,null,null,false,'mid',  false,false),
('b1000000-0000-0000-0000-000000000004',  9,'attack','win', 'full_buy', true, 'B',0.63,0.51, false,'late', false,true),
('b1000000-0000-0000-0000-000000000004', 10,'attack','loss','semi_buy', false,null,null,null,false,'early',false,false),
('b1000000-0000-0000-0000-000000000004', 11,'attack','win', 'full_buy', true, 'A',0.39,0.44, false,'mid',  false,true),
('b1000000-0000-0000-0000-000000000004', 12,'defense','win', 'pistol',  false,null,null,null,false,'mid',  false,true),
('b1000000-0000-0000-0000-000000000004', 13,'defense','loss','second',  true, 'A',0.38,0.45, false,'late', false,false),
('b1000000-0000-0000-0000-000000000004', 14,'defense','win', 'full_buy', false,null,null,null,false,'early',false,true),
('b1000000-0000-0000-0000-000000000004', 15,'defense','loss','full_buy', true, 'B',0.61,0.53, false,'mid',  false,false),
('b1000000-0000-0000-0000-000000000004', 16,'defense','loss','semi_buy', true, 'A',0.36,0.47, false,'late', false,false),
('b1000000-0000-0000-0000-000000000004', 17,'defense','loss','full_buy', true, 'B',0.62,0.52, false,'mid',  false,false),
('b1000000-0000-0000-0000-000000000004', 18,'defense','win', 'full_buy', false,null,null,null,false,'early',false,true),
('b1000000-0000-0000-0000-000000000004', 19,'defense','loss','eco',      false,null,null,null,false,'early',false,false),
('b1000000-0000-0000-0000-000000000004', 20,'defense','loss','full_buy', true, 'A',0.38,0.44, false,'late', false,false),
('b1000000-0000-0000-0000-000000000004', 21,'defense','loss','full_buy', true, 'B',0.63,0.50, false,'mid',  false,false),
('b1000000-0000-0000-0000-000000000004', 22,'defense','loss','full_buy', true, 'A',0.37,0.46, false,'late', true, false);

-- ============================================================
-- Rounds — Match 5: Sunset 13-5 (18 rounds)
-- ============================================================
INSERT INTO rounds (match_id, round_number, side, result, economy_type, planted, plant_site, plant_x, plant_y, retake, contact_timing, notable, first_blood_team) VALUES
('b1000000-0000-0000-0000-000000000005',  1,'attack','win', 'pistol',  true, 'A',0.48,0.38, false,'mid',  false,true),
('b1000000-0000-0000-0000-000000000005',  2,'attack','win', 'second',  true, 'B',0.67,0.55, false,'late', false,true),
('b1000000-0000-0000-0000-000000000005',  3,'attack','win', 'full_buy', true, 'A',0.47,0.39, false,'mid',  true, true),
('b1000000-0000-0000-0000-000000000005',  4,'attack','loss','eco',      false,null,null,null,false,'early',false,false),
('b1000000-0000-0000-0000-000000000005',  5,'attack','win', 'semi_buy', true, 'B',0.68,0.54, false,'late', false,true),
('b1000000-0000-0000-0000-000000000005',  6,'attack','win', 'full_buy', true, 'A',0.46,0.40, false,'mid',  false,true),
('b1000000-0000-0000-0000-000000000005',  7,'attack','win', 'full_buy', true, 'B',0.66,0.56, false,'late', false,true),
('b1000000-0000-0000-0000-000000000005',  8,'attack','loss','full_buy', false,null,null,null,false,'early',false,false),
('b1000000-0000-0000-0000-000000000005',  9,'attack','win', 'full_buy', true, 'A',0.48,0.37, false,'mid',  false,true),
('b1000000-0000-0000-0000-000000000005', 10,'defense','win', 'pistol',  false,null,null,null,false,'early',false,true),
('b1000000-0000-0000-0000-000000000005', 11,'defense','loss','second',  true, 'A',0.47,0.39, false,'mid',  false,false),
('b1000000-0000-0000-0000-000000000005', 12,'defense','win', 'full_buy', false,null,null,null,false,'early',true, true),
('b1000000-0000-0000-0000-000000000005', 13,'defense','win', 'full_buy', false,null,null,null,false,'mid',  false,true),
('b1000000-0000-0000-0000-000000000005', 14,'defense','loss','semi_buy', true, 'B',0.67,0.55, false,'late', false,false),
('b1000000-0000-0000-0000-000000000005', 15,'defense','loss','eco',      false,null,null,null,false,'early',false,false),
('b1000000-0000-0000-0000-000000000005', 16,'defense','win', 'full_buy', false,null,null,null,false,'early',false,true),
('b1000000-0000-0000-0000-000000000005', 17,'defense','loss','full_buy', true, 'A',0.48,0.38, false,'mid',  false,false),
('b1000000-0000-0000-0000-000000000005', 18,'defense','win', 'full_buy', false,null,null,null,false,'late', false,true);

-- ============================================================
-- Player Stats
-- ============================================================

-- Match 1: Ascent 13-8 (21 rounds)
INSERT INTO player_stats (match_id, player_id, agent, kills, deaths, assists, acs, hs_pct, first_bloods, first_deaths, rounds_played) VALUES
('b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','Omen',   18,14, 6,210,28.0,2,2,21),
('b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002','Jett',   24,11, 4,285,35.0,5,1,21),
('b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000003','Sova',   16,13, 9,220,22.0,2,3,21),
('b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000004','Killjoy',14,12, 7,195,30.0,1,2,21),
('b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000005','Reyna',  22,13, 3,255,38.0,3,2,21)
ON CONFLICT (match_id, player_id) DO NOTHING;

-- Match 2: Bind 7-13 (20 rounds)
INSERT INTO player_stats (match_id, player_id, agent, kills, deaths, assists, acs, hs_pct, first_bloods, first_deaths, rounds_played) VALUES
('b1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001','Viper',  12,17, 5,168,24.0,1,4,20),
('b1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000002','Neon',   15,18, 3,185,32.0,2,5,20),
('b1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000003','Fade',   11,16, 8,172,20.0,1,3,20),
('b1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000004','Cypher', 10,15, 5,158,26.0,0,4,20),
('b1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000005','Chamber',14,16, 2,195,40.0,3,3,20)
ON CONFLICT (match_id, player_id) DO NOTHING;

-- Match 3: Split 13-11 (24 rounds)
INSERT INTO player_stats (match_id, player_id, agent, kills, deaths, assists, acs, hs_pct, first_bloods, first_deaths, rounds_played) VALUES
('b1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000001','Astra',  17,16, 8,215,25.0,2,3,24),
('b1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000002','Jett',   26,14, 5,298,36.0,6,2,24),
('b1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000003','Sova',   19,15,10,232,23.0,3,3,24),
('b1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000004','Killjoy',16,14, 8,205,29.0,1,2,24),
('b1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000005','Reyna',  21,17, 4,248,37.0,4,3,24)
ON CONFLICT (match_id, player_id) DO NOTHING;

-- Match 4: Pearl 9-13 (22 rounds)
INSERT INTO player_stats (match_id, player_id, agent, kills, deaths, assists, acs, hs_pct, first_bloods, first_deaths, rounds_played) VALUES
('b1000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000001','Omen',   14,18, 6,180,22.0,1,4,22),
('b1000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000002','Neon',   17,19, 3,202,33.0,3,5,22),
('b1000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000003','Fade',   13,17, 9,188,21.0,1,4,22),
('b1000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000004','Cypher', 11,16, 5,165,27.0,0,3,22),
('b1000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000005','Iso',    16,18, 3,212,35.0,2,4,22)
ON CONFLICT (match_id, player_id) DO NOTHING;

-- Match 5: Sunset 13-5 (18 rounds)
INSERT INTO player_stats (match_id, player_id, agent, kills, deaths, assists, acs, hs_pct, first_bloods, first_deaths, rounds_played) VALUES
('b1000000-0000-0000-0000-000000000005','a1000000-0000-0000-0000-000000000001','Omen',   20,10, 7,268,29.0,3,1,18),
('b1000000-0000-0000-0000-000000000005','a1000000-0000-0000-0000-000000000002','Jett',   28, 8, 5,325,38.0,7,0,18),
('b1000000-0000-0000-0000-000000000005','a1000000-0000-0000-0000-000000000003','Sova',   21, 9,11,275,24.0,4,1,18),
('b1000000-0000-0000-0000-000000000005','a1000000-0000-0000-0000-000000000004','Killjoy',17, 8, 9,242,32.0,2,1,18),
('b1000000-0000-0000-0000-000000000005','a1000000-0000-0000-0000-000000000005','Reyna',  25, 9, 4,298,41.0,5,1,18)
ON CONFLICT (match_id, player_id) DO NOTHING;
