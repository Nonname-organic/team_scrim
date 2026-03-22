-- ============================================================
-- Seed data for development/testing
-- 開発用サンプルデータ
-- ============================================================

-- Team
INSERT INTO teams (id, name, tag, region) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Team Alpha', 'ALPH', 'JP')
ON CONFLICT DO NOTHING;

-- Players
INSERT INTO players (id, team_id, ign, role) VALUES
  ('aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Entry', 'duelist'),
  ('aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Smokes', 'controller'),
  ('aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Recon', 'initiator'),
  ('aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Lock', 'sentinel'),
  ('aaaaaaaa-0005-0005-0005-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'IGL', 'igl')
ON CONFLICT DO NOTHING;

-- Matches (10 sample matches)
INSERT INTO matches (id, team_id, opponent_name, match_date, map, match_type, team_score, opponent_score,
  attack_rounds_won, attack_rounds_played, defense_rounds_won, defense_rounds_played) VALUES
  ('m0000001-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Team Beta','2026-03-01','Ascent','scrim',13,9,7,12,6,10),
  ('m0000002-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Team Gamma','2026-03-02','Haven','scrim',13,11,6,13,7,11),
  ('m0000003-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Team Delta','2026-03-03','Bind','scrim',9,13,4,11,5,11),
  ('m0000004-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','Team Echo','2026-03-05','Icebox','scrim',13,7,8,12,5,8),
  ('m0000005-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','Team Beta','2026-03-06','Split','scrim',7,13,3,9,4,11),
  ('m0000006-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','Team Fox','2026-03-08','Ascent','scrim',13,10,7,11,6,12),
  ('m0000007-0000-0000-0000-000000000007','11111111-1111-1111-1111-111111111111','Team Gold','2026-03-10','Lotus','scrim',13,6,9,12,4,7),
  ('m0000008-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111','Team Hotel','2026-03-12','Bind','scrim',11,13,5,12,6,12),
  ('m0000009-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111','Team India','2026-03-14','Pearl','scrim',13,8,8,13,5,8),
  ('m0000010-0000-0000-0000-000000000010','11111111-1111-1111-1111-111111111111','Team Beta','2026-03-15','Ascent','official',13,11,7,12,6,12)
ON CONFLICT DO NOTHING;

-- Player stats for match 1 (Ascent, W 13-9)
INSERT INTO player_stats (match_id, player_id, agent, kills, deaths, assists, acs, adr, hs_pct, first_bloods, first_deaths, rounds_played, fbsr, kpr, dpr, apr) VALUES
  ('m0000001-0000-0000-0000-000000000001','aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa','Jett',18,12,3,280,165.0,32.0,5,2,22,0.714,0.818,0.545,0.136),
  ('m0000001-0000-0000-0000-000000000001','aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa','Omen',12,14,8,210,140.0,18.0,2,4,22,0.333,0.545,0.636,0.364),
  ('m0000001-0000-0000-0000-000000000001','aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa','Sova',15,11,10,245,155.0,22.0,3,3,22,0.500,0.682,0.500,0.455),
  ('m0000001-0000-0000-0000-000000000001','aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa','Killjoy',10,13,7,190,130.0,20.0,1,2,22,0.333,0.455,0.591,0.318),
  ('m0000001-0000-0000-0000-000000000001','aaaaaaaa-0005-0005-0005-aaaaaaaaaaaa','Brimstone',11,15,9,185,135.0,15.0,1,5,22,0.167,0.500,0.682,0.409)
ON CONFLICT (match_id, player_id) DO NOTHING;

-- Team stats for match 1
INSERT INTO team_stats (match_id, team_id, a_site_attack_wins, a_site_attack_total, b_site_attack_wins, b_site_attack_total,
  a_site_retake_wins, a_site_retake_total, b_site_retake_wins, b_site_retake_total,
  post_plant_wins, post_plant_total, fb_round_wins, fb_round_total, fd_round_wins, fd_round_total,
  pistol_wins, pistol_total, full_buy_wins, full_buy_total, eco_wins, eco_total) VALUES
  ('m0000001-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',
   4,7, 3,5, 1,3, 2,4, 6,9, 9,12, 3,10, 1,2, 8,12, 1,4)
ON CONFLICT DO NOTHING;

-- Rounds for match 1 (sample)
INSERT INTO rounds (match_id, round_number, side, result, economy_type, planted, plant_site, first_blood_team) VALUES
  ('m0000001-0000-0000-0000-000000000001',1,'attack','win','pistol',TRUE,'A',TRUE),
  ('m0000001-0000-0000-0000-000000000001',2,'attack','win','eco',TRUE,'B',TRUE),
  ('m0000001-0000-0000-0000-000000000001',3,'attack','loss','semi_buy',FALSE,NULL,FALSE),
  ('m0000001-0000-0000-0000-000000000001',4,'attack','win','full_buy',TRUE,'A',TRUE),
  ('m0000001-0000-0000-0000-000000000001',5,'attack','loss','full_buy',FALSE,NULL,FALSE),
  ('m0000001-0000-0000-0000-000000000001',13,'defense','win','pistol',FALSE,NULL,FALSE),
  ('m0000001-0000-0000-0000-000000000001',14,'defense','loss','eco',FALSE,NULL,FALSE),
  ('m0000001-0000-0000-0000-000000000001',15,'defense','win','full_buy',FALSE,NULL,TRUE),
  ('m0000001-0000-0000-0000-000000000001',16,'defense','win','full_buy',FALSE,NULL,TRUE),
  ('m0000001-0000-0000-0000-000000000001',17,'defense','loss','full_buy',TRUE,'B',FALSE)
ON CONFLICT DO NOTHING;
