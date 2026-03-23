-- Fix economy_type check constraint to include new types (oper, second, third) and remove force
ALTER TABLE rounds DROP CONSTRAINT IF EXISTS rounds_economy_type_check;
ALTER TABLE rounds ADD CONSTRAINT rounds_economy_type_check
  CHECK (economy_type IN ('pistol','eco','anti_eco','semi_eco','semi_buy','full_buy','oper','second','third'));
