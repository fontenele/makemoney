CREATE TABLE "agentic_wallet_funding_conversion_submission_attempts" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "request_fingerprint" CHAR(64) NOT NULL,
    "fresh_expected_usdt" TEXT NOT NULL,
    "fresh_minimum_usdt" TEXT NOT NULL,
    "fresh_remaining_quantity_bnb" TEXT NOT NULL,
    "state" VARCHAR(40) NOT NULL,
    "provider_order_id" VARCHAR(256),
    "response_fingerprint" CHAR(64),
    "automatic_retry_allowed" BOOLEAN NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "agentic_wallet_funding_conversion_submission_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agentic_wallet_funding_conversion_submission_attempts_plan_id_key"
ON "agentic_wallet_funding_conversion_submission_attempts"("plan_id");

CREATE UNIQUE INDEX "agentic_wallet_funding_conversion_submission_attempts_provider_order_id_key"
ON "agentic_wallet_funding_conversion_submission_attempts"("provider_order_id");

CREATE INDEX "agentic_wallet_funding_conversion_submission_attempts_state_started_at_idx"
ON "agentic_wallet_funding_conversion_submission_attempts"("state", "started_at");

ALTER TABLE "agentic_wallet_funding_conversion_submission_attempts"
ADD CONSTRAINT "agentic_wallet_funding_conversion_submission_attempts_plan_id_fkey"
FOREIGN KEY ("plan_id") REFERENCES "agentic_wallet_funding_conversion_plans"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
