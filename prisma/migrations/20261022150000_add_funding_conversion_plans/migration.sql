CREATE TABLE "agentic_wallet_funding_conversion_plans" (
    "id" UUID NOT NULL,
    "fingerprint" CHAR(64) NOT NULL,
    "confirmation_phrase_digest" CHAR(64) NOT NULL,
    "provider_id" VARCHAR(32) NOT NULL,
    "chain_id" VARCHAR(32) NOT NULL,
    "source_token_address" VARCHAR(42) NOT NULL,
    "target_token_address" VARCHAR(42) NOT NULL,
    "source_quantity_bnb" TEXT NOT NULL,
    "expected_usdt" TEXT NOT NULL,
    "minimum_usdt" TEXT NOT NULL,
    "maximum_slippage_percent" TEXT NOT NULL,
    "remaining_quantity_bnb" TEXT NOT NULL,
    "mev_protection" BOOLEAN NOT NULL,
    "gas_level" VARCHAR(16) NOT NULL,
    "cost_coverage" VARCHAR(16) NOT NULL,
    "gas_reserve_sufficiency" VARCHAR(16) NOT NULL,
    "activation_blockers" JSONB NOT NULL,
    "execution_configuration_ready" BOOLEAN NOT NULL,
    "quoted_at" TIMESTAMP(3) NOT NULL,
    "quote_expires_at" TIMESTAMP(3) NOT NULL,
    "prepared_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agentic_wallet_funding_conversion_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agentic_wallet_funding_conversion_plans_fingerprint_key"
ON "agentic_wallet_funding_conversion_plans"("fingerprint");

CREATE INDEX "agentic_wallet_funding_conversion_plans_prepared_at_id_idx"
ON "agentic_wallet_funding_conversion_plans"("prepared_at", "id");
