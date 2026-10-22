CREATE TABLE "agentic_wallet_funding_conversion_financial_reconciliations" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status_observation_id" UUID NOT NULL,
    "provider_order_id" VARCHAR(256) NOT NULL,
    "transaction_hash" VARCHAR(66) NOT NULL,
    "chain_id" VARCHAR(32) NOT NULL,
    "source_token_address" VARCHAR(42) NOT NULL,
    "target_token_address" VARCHAR(42) NOT NULL,
    "submitted_source_quantity_bnb" TEXT NOT NULL,
    "expected_usdt" TEXT NOT NULL,
    "minimum_usdt" TEXT NOT NULL,
    "actual_usdt_received" TEXT NOT NULL,
    "output_assessment" VARCHAR(48) NOT NULL,
    "provider_fee_components" JSONB NOT NULL,
    "network_fee_asset" VARCHAR(16) NOT NULL,
    "network_fee_quantity_bnb" TEXT NOT NULL,
    "observed_at" TIMESTAMP(3) NOT NULL,
    "request_fingerprint" CHAR(64) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agentic_wallet_funding_conversion_financial_reconciliations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "funding_conversion_financial_attempt_key" ON "agentic_wallet_funding_conversion_financial_reconciliations"("attempt_id");
CREATE UNIQUE INDEX "funding_conversion_financial_status_key" ON "agentic_wallet_funding_conversion_financial_reconciliations"("status_observation_id");
CREATE UNIQUE INDEX "funding_conversion_financial_order_key" ON "agentic_wallet_funding_conversion_financial_reconciliations"("provider_order_id");
CREATE UNIQUE INDEX "funding_conversion_financial_tx_key" ON "agentic_wallet_funding_conversion_financial_reconciliations"("transaction_hash");
CREATE UNIQUE INDEX "funding_conversion_financial_request_key" ON "agentic_wallet_funding_conversion_financial_reconciliations"("request_fingerprint");
CREATE INDEX "funding_conversion_financial_recorded_idx" ON "agentic_wallet_funding_conversion_financial_reconciliations"("recorded_at");

ALTER TABLE "agentic_wallet_funding_conversion_financial_reconciliations" ADD CONSTRAINT "funding_conversion_financial_attempt_fkey" FOREIGN KEY ("attempt_id") REFERENCES "agentic_wallet_funding_conversion_submission_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "agentic_wallet_funding_conversion_financial_reconciliations" ADD CONSTRAINT "funding_conversion_financial_status_fkey" FOREIGN KEY ("status_observation_id") REFERENCES "agentic_wallet_funding_conversion_status_observations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
