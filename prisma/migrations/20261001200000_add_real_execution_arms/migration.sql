CREATE TABLE "real_execution_arms" (
    "id" UUID NOT NULL,
    "reservation_id" UUID NOT NULL,
    "provider_id" VARCHAR(32) NOT NULL,
    "chain_id" VARCHAR(32) NOT NULL,
    "intent_id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "acknowledgment" VARCHAR(64) NOT NULL,
    "request_fingerprint" CHAR(64) NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "real_execution_arms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "real_execution_arms_reservation_id_key"
ON "real_execution_arms"("reservation_id");

CREATE UNIQUE INDEX "real_execution_arms_intent_id_key"
ON "real_execution_arms"("intent_id");

CREATE UNIQUE INDEX "real_execution_arms_quote_id_key"
ON "real_execution_arms"("quote_id");

CREATE INDEX "real_execution_arms_provider_id_chain_id_expires_at_idx"
ON "real_execution_arms"("provider_id", "chain_id", "expires_at");

ALTER TABLE "real_execution_arms"
ADD CONSTRAINT "real_execution_arms_reservation_id_fkey"
FOREIGN KEY ("reservation_id") REFERENCES "real_execution_reservations"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
