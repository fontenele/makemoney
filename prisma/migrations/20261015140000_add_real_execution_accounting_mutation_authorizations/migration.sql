CREATE TABLE "real_execution_accounting_mutation_authorizations" (
    "id" UUID NOT NULL,
    "accounting_mutation_commitment_id" UUID NOT NULL,
    "accounting_balance_evidence_id" UUID NOT NULL,
    "financial_reconciliation_evidence_id" UUID NOT NULL,
    "gate_id" UUID NOT NULL,
    "transaction_hash" VARCHAR(66) NOT NULL,
    "plan_fingerprint" CHAR(64) NOT NULL,
    "acknowledgment" VARCHAR(96) NOT NULL,
    "authorized_at" TIMESTAMP(3) NOT NULL,
    "request_fingerprint" CHAR(64) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "real_exec_acct_auth_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "real_exec_acct_auth_commitment_key" ON "real_execution_accounting_mutation_authorizations"("accounting_mutation_commitment_id");
CREATE UNIQUE INDEX "real_exec_acct_auth_balance_key" ON "real_execution_accounting_mutation_authorizations"("accounting_balance_evidence_id");
CREATE UNIQUE INDEX "real_exec_acct_auth_financial_key" ON "real_execution_accounting_mutation_authorizations"("financial_reconciliation_evidence_id");
CREATE UNIQUE INDEX "real_exec_acct_auth_gate_key" ON "real_execution_accounting_mutation_authorizations"("gate_id");
CREATE UNIQUE INDEX "real_exec_acct_auth_tx_key" ON "real_execution_accounting_mutation_authorizations"("transaction_hash");
CREATE UNIQUE INDEX "real_exec_acct_auth_plan_key" ON "real_execution_accounting_mutation_authorizations"("plan_fingerprint");
CREATE INDEX "real_exec_acct_auth_recorded_at_idx" ON "real_execution_accounting_mutation_authorizations"("recorded_at");

ALTER TABLE "real_execution_accounting_mutation_authorizations" ADD CONSTRAINT "real_exec_acct_auth_commitment_fkey" FOREIGN KEY ("accounting_mutation_commitment_id") REFERENCES "real_execution_accounting_mutation_commitments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
