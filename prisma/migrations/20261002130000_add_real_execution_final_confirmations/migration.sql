CREATE TABLE "real_execution_final_confirmations" (
    "id" UUID NOT NULL,
    "approval_id" UUID NOT NULL,
    "reservation_id" UUID NOT NULL,
    "arm_id" UUID NOT NULL,
    "provider_id" VARCHAR(32) NOT NULL,
    "chain_id" VARCHAR(32) NOT NULL,
    "intent_id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "emergency_stop_change_id" VARCHAR(100) NOT NULL,
    "acknowledgment" VARCHAR(100) NOT NULL,
    "request_fingerprint" CHAR(64) NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "real_execution_final_confirmations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "real_execution_final_confirmations_approval_id_key"
ON "real_execution_final_confirmations"("approval_id");

CREATE UNIQUE INDEX "real_execution_final_confirmations_reservation_id_key"
ON "real_execution_final_confirmations"("reservation_id");

CREATE UNIQUE INDEX "real_execution_final_confirmations_arm_id_key"
ON "real_execution_final_confirmations"("arm_id");

CREATE UNIQUE INDEX "real_execution_final_confirmations_intent_id_key"
ON "real_execution_final_confirmations"("intent_id");

CREATE UNIQUE INDEX "real_execution_final_confirmations_quote_id_key"
ON "real_execution_final_confirmations"("quote_id");

CREATE INDEX "real_execution_final_confirmations_provider_id_chain_id_expires_at_idx"
ON "real_execution_final_confirmations"("provider_id", "chain_id", "expires_at");

ALTER TABLE "real_execution_final_confirmations"
ADD CONSTRAINT "real_execution_final_confirmations_approval_id_fkey"
FOREIGN KEY ("approval_id") REFERENCES "real_execution_risk_approvals"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
