CREATE TABLE "real_execution_reservations" (
    "id" UUID NOT NULL,
    "provider_id" VARCHAR(32) NOT NULL,
    "chain_id" VARCHAR(32) NOT NULL,
    "intent_id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(128) NOT NULL,
    "request_fingerprint" CHAR(64) NOT NULL,
    "utc_day" DATE NOT NULL,
    "budget_charge_usdt" TEXT NOT NULL,
    "source_token_address" VARCHAR(256) NOT NULL,
    "source_symbol" VARCHAR(32) NOT NULL,
    "source_quantity" TEXT NOT NULL,
    "native_gas_symbol" VARCHAR(32) NOT NULL,
    "native_gas_quantity" TEXT NOT NULL,
    "provider_quota_usd" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "real_execution_reservations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "real_execution_reservations_intent_id_key"
ON "real_execution_reservations"("intent_id");

CREATE UNIQUE INDEX "real_execution_reservations_quote_id_key"
ON "real_execution_reservations"("quote_id");

CREATE UNIQUE INDEX "real_execution_reservations_idempotency_key_key"
ON "real_execution_reservations"("idempotency_key");

CREATE INDEX "real_execution_reservations_provider_id_chain_id_utc_day_expires_at_idx"
ON "real_execution_reservations"("provider_id", "chain_id", "utc_day", "expires_at");
