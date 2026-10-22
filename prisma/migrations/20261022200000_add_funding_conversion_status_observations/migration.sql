CREATE TABLE "agentic_wallet_funding_conversion_status_observations" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "provider_order_id" VARCHAR(256) NOT NULL,
    "provider_status" VARCHAR(16) NOT NULL,
    "transaction_hash" VARCHAR(66),
    "booked_at" TIMESTAMP(3) NOT NULL,
    "provider_updated_at" TIMESTAMP(3) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agentic_wallet_funding_conversion_status_observations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "funding_conversion_status_tx_hash_key"
ON "agentic_wallet_funding_conversion_status_observations"("transaction_hash");

CREATE UNIQUE INDEX "funding_conversion_status_attempt_updated_key"
ON "agentic_wallet_funding_conversion_status_observations"("attempt_id", "provider_updated_at");

CREATE INDEX "funding_conversion_status_attempt_recorded_idx"
ON "agentic_wallet_funding_conversion_status_observations"("attempt_id", "recorded_at");

ALTER TABLE "agentic_wallet_funding_conversion_status_observations"
ADD CONSTRAINT "agentic_wallet_funding_conversion_status_observations_attempt_id_fkey"
FOREIGN KEY ("attempt_id") REFERENCES "agentic_wallet_funding_conversion_submission_attempts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
