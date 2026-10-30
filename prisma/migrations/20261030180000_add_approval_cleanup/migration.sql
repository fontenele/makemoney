CREATE TABLE "approval_cleanup_obligations" (
  "id" UUID PRIMARY KEY,
  "operation_id" UUID NOT NULL UNIQUE,
  "wallet_hash" CHAR(64) NOT NULL,
  "fingerprint" CHAR(64) NOT NULL,
  "state" VARCHAR(32) NOT NULL CHECK (state IN ('awaiting_operation','ready','claimed','submitted','unknown','failed','cleared')),
  "record" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (wallet_hash ~ '^[a-f0-9]{64}$'),
  CHECK (fingerprint ~ '^[a-f0-9]{64}$')
);
CREATE UNIQUE INDEX "approval_cleanup_one_unresolved_wallet" ON "approval_cleanup_obligations" ("wallet_hash") WHERE state <> 'cleared';
