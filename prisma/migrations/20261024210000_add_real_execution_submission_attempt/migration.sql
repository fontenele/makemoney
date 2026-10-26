CREATE TABLE "real_execution_submission_attempts" (
    "id" UUID NOT NULL,
    "gate_id" UUID NOT NULL,
    "request_fingerprint" CHAR(64) NOT NULL,
    "provider_id" VARCHAR(32) NOT NULL,
    "chain_id" VARCHAR(32) NOT NULL,
    "payload_commitment_version" VARCHAR(64) NOT NULL,
    "payload_commitment_digest" CHAR(64) NOT NULL,
    "emergency_stop_change_id" VARCHAR(100) NOT NULL,
    "command_arguments_fingerprint" CHAR(64) NOT NULL,
    "state" VARCHAR(32) NOT NULL,
    "automatic_retry_allowed" BOOLEAN NOT NULL,
    "claimed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "real_execution_submission_attempts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "real_execution_submission_attempts_provider_check" CHECK ("provider_id" = 'agentic_wallet'),
    CONSTRAINT "real_execution_submission_attempts_chain_check" CHECK ("chain_id" = '56'),
    CONSTRAINT "real_execution_submission_attempts_payload_version_check" CHECK ("payload_commitment_version" = 'real_execution_intent_quote_v1'),
    CONSTRAINT "real_execution_submission_attempts_request_fingerprint_check" CHECK ("request_fingerprint" ~ '^[a-f0-9]{64}$'),
    CONSTRAINT "real_execution_submission_attempts_payload_digest_check" CHECK ("payload_commitment_digest" ~ '^[a-f0-9]{64}$'),
    CONSTRAINT "real_execution_submission_attempts_command_fingerprint_check" CHECK ("command_arguments_fingerprint" ~ '^[a-f0-9]{64}$'),
    CONSTRAINT "real_execution_submission_attempts_state_check" CHECK ("state" = 'submission_claimed'),
    CONSTRAINT "real_execution_submission_attempts_retry_check" CHECK ("automatic_retry_allowed" = FALSE)
);

CREATE UNIQUE INDEX "real_execution_submission_attempts_gate_id_key"
ON "real_execution_submission_attempts"("gate_id");

CREATE UNIQUE INDEX "real_execution_submission_attempts_request_fingerprint_key"
ON "real_execution_submission_attempts"("request_fingerprint");

CREATE INDEX "real_execution_submission_attempts_provider_id_state_claimed_at_idx"
ON "real_execution_submission_attempts"("provider_id", "state", "claimed_at");

ALTER TABLE "real_execution_submission_attempts"
ADD CONSTRAINT "real_execution_submission_attempts_gate_id_fkey"
FOREIGN KEY ("gate_id") REFERENCES "real_execution_submission_gates"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
