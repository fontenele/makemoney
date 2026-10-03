CREATE TABLE "real_execution_submission_receipts" (
  "gate_id" UUID NOT NULL,
  "provider_id" VARCHAR(32) NOT NULL,
  "provider_order_id" VARCHAR(256) NOT NULL,
  "lifecycle_status" VARCHAR(32) NOT NULL,
  "provider_submission_acknowledged" BOOLEAN NOT NULL,
  "terminal" BOOLEAN NOT NULL,
  "execution_succeeded" BOOLEAN NOT NULL,
  "status_lookup_required" BOOLEAN NOT NULL,
  "automatic_retry_allowed" BOOLEAN NOT NULL,
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "real_execution_submission_receipts_pkey" PRIMARY KEY ("gate_id"),
  CONSTRAINT "real_execution_submission_receipts_provider_order_id_key" UNIQUE ("provider_order_id"),
  CONSTRAINT "real_execution_submission_receipts_gate_id_fkey"
    FOREIGN KEY ("gate_id")
    REFERENCES "real_execution_submission_gates"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT "real_execution_submission_receipts_state_check" CHECK (
    "provider_id" = 'agentic_wallet'
    AND "provider_order_id" ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$'
    AND "lifecycle_status" = 'pending_confirmation'
    AND "provider_submission_acknowledged" = TRUE
    AND "terminal" = FALSE
    AND "execution_succeeded" = FALSE
    AND "status_lookup_required" = TRUE
    AND "automatic_retry_allowed" = FALSE
  )
);

CREATE INDEX "real_execution_submission_receipts_provider_id_lifecycle_status_recorded_at_idx"
ON "real_execution_submission_receipts"("provider_id", "lifecycle_status", "recorded_at");
