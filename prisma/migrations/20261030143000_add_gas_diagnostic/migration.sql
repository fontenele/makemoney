CREATE TABLE "gas_diagnostics" (
  "id" UUID PRIMARY KEY,
  "slot" TEXT NOT NULL UNIQUE CHECK ("slot" = 'single_btcb_gas_test'),
  "state" TEXT NOT NULL CHECK ("state" IN ('prepared', 'claimed', 'submitted', 'unknown')),
  "fingerprint" VARCHAR(64) NOT NULL,
  "plan" JSONB NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "claimed_at" TIMESTAMPTZ,
  "provider_order_id" VARCHAR(100),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
