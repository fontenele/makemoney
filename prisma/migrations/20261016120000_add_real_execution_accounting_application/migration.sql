CREATE TABLE "real_execution_accounting_balances" (
    "asset_identity" VARCHAR(64) NOT NULL,
    "asset_type" VARCHAR(16) NOT NULL,
    "asset_address" VARCHAR(42),
    "asset_symbol" VARCHAR(16),
    "quantity" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "real_execution_accounting_balances_pkey" PRIMARY KEY ("asset_identity"),
    CONSTRAINT "real_execution_accounting_balances_asset_shape_check" CHECK (
      ("asset_type" = 'token' AND "asset_address" IS NOT NULL AND "asset_symbol" IS NULL)
      OR
      ("asset_type" = 'native' AND "asset_address" IS NULL AND "asset_symbol" = 'BNB')
    )
);

CREATE TABLE "real_execution_accounting_mutation_applications" (
    "id" UUID NOT NULL,
    "authorization_id" UUID NOT NULL,
    "accounting_mutation_commitment_id" UUID NOT NULL,
    "accounting_balance_evidence_id" UUID NOT NULL,
    "financial_reconciliation_evidence_id" UUID NOT NULL,
    "gate_id" UUID NOT NULL,
    "transaction_hash" VARCHAR(66) NOT NULL,
    "plan_fingerprint" CHAR(64) NOT NULL,
    "acknowledgment" VARCHAR(96) NOT NULL,
    "current_balances" JSONB NOT NULL,
    "balance_transitions" JSONB NOT NULL,
    "authorization_recorded_at" TIMESTAMP(3) NOT NULL,
    "balances_observed_at" TIMESTAMP(3) NOT NULL,
    "prepared_at" TIMESTAMP(3) NOT NULL,
    "request_fingerprint" CHAR(64) NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "real_execution_accounting_mutation_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "real_exec_acct_app_authorization_key" ON "real_execution_accounting_mutation_applications"("authorization_id");
CREATE UNIQUE INDEX "real_exec_acct_app_commitment_key" ON "real_execution_accounting_mutation_applications"("accounting_mutation_commitment_id");
CREATE UNIQUE INDEX "real_exec_acct_app_balance_key" ON "real_execution_accounting_mutation_applications"("accounting_balance_evidence_id");
CREATE UNIQUE INDEX "real_exec_acct_app_financial_key" ON "real_execution_accounting_mutation_applications"("financial_reconciliation_evidence_id");
CREATE UNIQUE INDEX "real_exec_acct_app_gate_key" ON "real_execution_accounting_mutation_applications"("gate_id");
CREATE UNIQUE INDEX "real_exec_acct_app_tx_key" ON "real_execution_accounting_mutation_applications"("transaction_hash");
CREATE UNIQUE INDEX "real_exec_acct_app_plan_key" ON "real_execution_accounting_mutation_applications"("plan_fingerprint");
CREATE INDEX "real_exec_acct_app_applied_at_idx" ON "real_execution_accounting_mutation_applications"("applied_at");

ALTER TABLE "real_execution_accounting_mutation_applications" ADD CONSTRAINT "real_exec_acct_app_authorization_fkey" FOREIGN KEY ("authorization_id") REFERENCES "real_execution_accounting_mutation_authorizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
