CREATE TABLE "real_execution_financial_reconciliation_evidence" (
    "id" UUID NOT NULL,
    "gate_id" UUID NOT NULL,
    "status_observation_id" UUID NOT NULL,
    "provider_id" VARCHAR(32) NOT NULL,
    "provider_order_id" VARCHAR(256) NOT NULL,
    "chain_id" VARCHAR(32) NOT NULL,
    "transaction_hash" VARCHAR(66) NOT NULL,
    "source_token_address" VARCHAR(256) NOT NULL,
    "target_token_address" VARCHAR(256) NOT NULL,
    "submitted_source_quantity" TEXT NOT NULL,
    "actual_target_received_quantity" TEXT NOT NULL,
    "provider_fee_components" JSONB NOT NULL,
    "network_fee_asset" VARCHAR(16) NOT NULL,
    "network_fee_quantity" TEXT NOT NULL,
    "request_fingerprint" CHAR(64) NOT NULL,
    "observed_at" TIMESTAMP(3) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "real_execution_financial_reconciliation_evidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "real_execution_financial_reconciliation_evidence_gate_id_key" ON "real_execution_financial_reconciliation_evidence"("gate_id");
CREATE UNIQUE INDEX "real_execution_financial_reconciliation_evidence_status_observation_id_key" ON "real_execution_financial_reconciliation_evidence"("status_observation_id");
CREATE UNIQUE INDEX "real_execution_financial_reconciliation_evidence_provider_order_id_key" ON "real_execution_financial_reconciliation_evidence"("provider_order_id");
CREATE UNIQUE INDEX "real_execution_financial_reconciliation_evidence_transaction_hash_key" ON "real_execution_financial_reconciliation_evidence"("transaction_hash");
CREATE INDEX "real_execution_financial_reconciliation_evidence_provider_id_recorded_at_idx" ON "real_execution_financial_reconciliation_evidence"("provider_id", "recorded_at");

ALTER TABLE "real_execution_financial_reconciliation_evidence" ADD CONSTRAINT "real_execution_financial_reconciliation_evidence_gate_id_fkey" FOREIGN KEY ("gate_id") REFERENCES "real_execution_submission_gates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "real_execution_financial_reconciliation_evidence" ADD CONSTRAINT "real_execution_financial_reconciliation_evidence_status_observation_id_fkey" FOREIGN KEY ("status_observation_id") REFERENCES "real_execution_status_observations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
