CREATE TABLE "real_execution_accounting_mutation_commitments" (
    "id" UUID NOT NULL,
    "accounting_balance_evidence_id" UUID NOT NULL,
    "financial_reconciliation_evidence_id" UUID NOT NULL,
    "gate_id" UUID NOT NULL,
    "transaction_hash" VARCHAR(66) NOT NULL,
    "plan_fingerprint" CHAR(64) NOT NULL,
    "balance_transitions" JSONB NOT NULL,
    "evidence_observed_at" TIMESTAMP(3) NOT NULL,
    "evidence_recorded_at" TIMESTAMP(3) NOT NULL,
    "prepared_at" TIMESTAMP(3) NOT NULL,
    "request_fingerprint" CHAR(64) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "real_execution_accounting_mutation_commitments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "real_execution_accounting_mutation_commitments_accounting_balance_evidence_id_key" ON "real_execution_accounting_mutation_commitments"("accounting_balance_evidence_id");
CREATE UNIQUE INDEX "real_execution_accounting_mutation_commitments_financial_reconciliation_evidence_id_key" ON "real_execution_accounting_mutation_commitments"("financial_reconciliation_evidence_id");
CREATE UNIQUE INDEX "real_execution_accounting_mutation_commitments_gate_id_key" ON "real_execution_accounting_mutation_commitments"("gate_id");
CREATE UNIQUE INDEX "real_execution_accounting_mutation_commitments_transaction_hash_key" ON "real_execution_accounting_mutation_commitments"("transaction_hash");
CREATE UNIQUE INDEX "real_execution_accounting_mutation_commitments_plan_fingerprint_key" ON "real_execution_accounting_mutation_commitments"("plan_fingerprint");
CREATE INDEX "real_execution_accounting_mutation_commitments_recorded_at_idx" ON "real_execution_accounting_mutation_commitments"("recorded_at");

ALTER TABLE "real_execution_accounting_mutation_commitments" ADD CONSTRAINT "real_execution_accounting_mutation_commitments_accounting_balance_evidence_id_fkey" FOREIGN KEY ("accounting_balance_evidence_id") REFERENCES "real_execution_accounting_balance_evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "real_execution_accounting_mutation_commitments" ADD CONSTRAINT "real_execution_accounting_mutation_commitments_financial_reconciliation_evidence_id_fkey" FOREIGN KEY ("financial_reconciliation_evidence_id") REFERENCES "real_execution_financial_reconciliation_evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
