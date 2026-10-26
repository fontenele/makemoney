CREATE TABLE "real_execution_submission_outcomes" (
    "attempt_id" UUID NOT NULL,
    "gate_id" UUID NOT NULL,
    "status" VARCHAR(40) NOT NULL,
    "provider_order_id" VARCHAR(256),
    "response_fingerprint" CHAR(64) NOT NULL,
    "blockers" JSONB NOT NULL,
    "execution_succeeded" BOOLEAN NOT NULL,
    "reconciliation_required" BOOLEAN NOT NULL,
    "automatic_retry_allowed" BOOLEAN NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "real_execution_submission_outcomes_pkey" PRIMARY KEY ("attempt_id")
);

CREATE UNIQUE INDEX "real_execution_submission_outcomes_gate_id_key"
ON "real_execution_submission_outcomes"("gate_id");

CREATE UNIQUE INDEX "real_execution_submission_outcomes_provider_order_id_key"
ON "real_execution_submission_outcomes"("provider_order_id");

CREATE INDEX "real_execution_submission_outcomes_status_completed_at_idx"
ON "real_execution_submission_outcomes"("status", "completed_at");

ALTER TABLE "real_execution_submission_outcomes"
ADD CONSTRAINT "real_execution_submission_outcomes_attempt_id_fkey"
FOREIGN KEY ("attempt_id") REFERENCES "real_execution_submission_attempts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
