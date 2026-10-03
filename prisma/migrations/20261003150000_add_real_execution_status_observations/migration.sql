CREATE UNIQUE INDEX "real_execution_submission_receipts_gate_id_provider_id_provider_order_id_key"
ON "real_execution_submission_receipts"("gate_id", "provider_id", "provider_order_id");

CREATE TABLE "real_execution_status_observations" (
  "id" UUID NOT NULL,
  "sequence" BIGSERIAL NOT NULL,
  "gate_id" UUID NOT NULL,
  "provider_id" VARCHAR(32) NOT NULL,
  "provider_order_id" VARCHAR(256) NOT NULL,
  "provider_status" VARCHAR(16) NOT NULL,
  "transaction_hash" VARCHAR(66),
  "booked_at" TIMESTAMP(3) NOT NULL,
  "provider_updated_at" TIMESTAMP(3) NOT NULL,
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "real_execution_status_observations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "real_execution_status_observations_sequence_key" UNIQUE ("sequence"),
  CONSTRAINT "real_execution_status_observations_gate_id_fkey"
    FOREIGN KEY ("gate_id", "provider_id", "provider_order_id")
    REFERENCES "real_execution_submission_receipts"("gate_id", "provider_id", "provider_order_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "real_execution_status_observations_state_check" CHECK (
    "provider_id" = 'agentic_wallet'
    AND "provider_order_id" ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$'
    AND "provider_status" IN ('PENDING', 'FINISHED', 'FAILED')
    AND ("transaction_hash" IS NULL OR "transaction_hash" ~ '^0x[0-9a-f]{64}$')
    AND ("provider_status" <> 'FINISHED' OR "transaction_hash" IS NOT NULL)
    AND "provider_updated_at" >= "booked_at"
  )
);

CREATE INDEX "real_execution_status_observations_gate_id_sequence_idx"
ON "real_execution_status_observations"("gate_id", "sequence");

CREATE INDEX "real_execution_status_observations_provider_id_provider_status_recorded_at_idx"
ON "real_execution_status_observations"("provider_id", "provider_status", "recorded_at");
