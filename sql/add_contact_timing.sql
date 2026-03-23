-- ラウンドの接触タイミング（early/mid/late）カラムを追加
-- early : 0〜25秒 → ラッシュ判定
-- mid   : 25〜75秒 → スタンダード
-- late  : 75秒〜  → スロー・スタル
ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS contact_timing VARCHAR(10) CHECK (contact_timing IN ('early', 'mid', 'late'));
