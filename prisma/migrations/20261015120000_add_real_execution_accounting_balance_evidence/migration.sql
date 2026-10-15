CREATE TABLE "real_execution_accounting_balance_evidence" (
    "id" UUID NOT NULL,
    "financial_reconciliation_evidence_id" UUID NOT NULL,
    "gate_id" UUID NOT NULL,
    "transaction_hash" VARCHAR(66) NOT NULL,
    "balance_changes" JSONB NOT NULL,
    "request_fingerprint" CHAR(64) NOT NULL,
    "observed_at" TIMESTAMP(3) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "real_execution_accounting_balance_evidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "real_execution_accounting_balance_evidence_financial_reconciliation_evidence_id_key" ON "real_execution_accounting_balance_evidence"("financial_reconciliation_evidence_id");
CREATE UNIQUE INDEX "real_execution_accounting_balance_evidence_gate_id_key" ON "real_execution_accounting_balance_evidence"("gate_id");
CREATE UNIQUE INDEX "real_execution_accounting_balance_evidence_transaction_hash_key" ON "real_execution_accounting_balance_evidence"("transaction_hash");
CREATE INDEX "real_execution_accounting_balance_evidence_recorded_at_idx" ON "real_execution_accounting_balance_evidence"("recorded_at");

ALTER TABLE "real_execution_accounting_balance_evidence" ADD CONSTRAINT "real_execution_accounting_balance_evidence_financial_reconciliation_evidence_id_fkey" FOREIGN KEY ("financial_reconciliation_evidence_id") REFERENCES "real_execution_financial_reconciliation_evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
