-- Migration 012: Add payment_orders table for non-subscription payments
CREATE TABLE IF NOT EXISTS payment_orders (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id           UUID         REFERENCES teams(id) ON DELETE CASCADE,
  user_id           UUID         NOT NULL,
  plan              VARCHAR(20)  NOT NULL CHECK (plan IN ('pro','team')),
  months            SMALLINT     NOT NULL DEFAULT 1,
  amount            INTEGER      NOT NULL,
  payment_method    VARCHAR(30)  NOT NULL,
  status            VARCHAR(20)  NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','paid','expired','cancelled')),
  reference         VARCHAR(20),
  stripe_session_id VARCHAR(255),
  notes             TEXT,
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_team
  ON payment_orders(team_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_stripe
  ON payment_orders(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_orders_reference
  ON payment_orders(reference)
  WHERE reference IS NOT NULL;
