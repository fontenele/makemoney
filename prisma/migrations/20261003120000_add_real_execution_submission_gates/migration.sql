CREATE TABLE "real_execution_submission_gates" (
    "id" UUID NOT NULL,
    "confirmation_id" UUID NOT NULL,
    "approval_id" UUID NOT NULL,
    "reservation_id" UUID NOT NULL,
    "arm_id" UUID NOT NULL,
    "submission_plan_id" UUID NOT NULL,
    "provider_id" VARCHAR(32) NOT NULL,
    "chain_id" VARCHAR(32) NOT NULL,
    "intent_id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "payload_commitment_version" VARCHAR(64) NOT NULL,
    "payload_commitment_digest" CHAR(64) NOT NULL,
    "emergency_stop_change_id" VARCHAR(100) NOT NULL,
    "source_token_address" VARCHAR(256) NOT NULL,
    "target_token_address" VARCHAR(256) NOT NULL,
    "source_quantity" TEXT NOT NULL,
    "maximum_slippage_percent" TEXT NOT NULL,
    "mev_protection" BOOLEAN NOT NULL,
    "gas_level" VARCHAR(16) NOT NULL,
    "status" VARCHAR(40) NOT NULL,
    "request_fingerprint" CHAR(64) NOT NULL,
    "emergency_stop_rechecked_at" TIMESTAMP(3) NOT NULL,
    "confirmation_consumed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "real_execution_submission_gates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "real_execution_submission_gates_payload_check" CHECK (
      "provider_id" = 'agentic_wallet'
      AND "chain_id" = '56'
      AND "payload_commitment_version" = 'real_execution_intent_quote_v1'
      AND "payload_commitment_digest" ~ '^[0-9a-f]{64}$'
      AND "mev_protection" = TRUE
      AND "gas_level" = 'MEDIUM'
      AND "status" = 'prepared_not_submitted'
      AND "emergency_stop_rechecked_at" = "confirmation_consumed_at"
    )
);

CREATE UNIQUE INDEX "real_execution_submission_gates_confirmation_id_key"
ON "real_execution_submission_gates"("confirmation_id");

CREATE UNIQUE INDEX "real_execution_submission_gates_approval_id_key"
ON "real_execution_submission_gates"("approval_id");

CREATE UNIQUE INDEX "real_execution_submission_gates_reservation_id_key"
ON "real_execution_submission_gates"("reservation_id");

CREATE UNIQUE INDEX "real_execution_submission_gates_arm_id_key"
ON "real_execution_submission_gates"("arm_id");

CREATE UNIQUE INDEX "real_execution_submission_gates_submission_plan_id_key"
ON "real_execution_submission_gates"("submission_plan_id");

CREATE UNIQUE INDEX "real_execution_submission_gates_intent_id_key"
ON "real_execution_submission_gates"("intent_id");

CREATE UNIQUE INDEX "real_execution_submission_gates_quote_id_key"
ON "real_execution_submission_gates"("quote_id");

CREATE INDEX "real_execution_submission_gates_provider_id_chain_id_created_at_idx"
ON "real_execution_submission_gates"("provider_id", "chain_id", "created_at");

ALTER TABLE "real_execution_submission_gates"
ADD CONSTRAINT "real_execution_submission_gates_confirmation_id_fkey"
FOREIGN KEY ("confirmation_id") REFERENCES "real_execution_final_confirmations"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
