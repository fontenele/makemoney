CREATE TABLE "real_execution_accounting_ledger_reconciliations" (
    "id" UUID NOT NULL,
    "initialization_id" UUID NOT NULL,
    "provider_id" VARCHAR(32) NOT NULL,
    "chain_id" VARCHAR(32) NOT NULL,
    "reconciliation_fingerprint" CHAR(64) NOT NULL,
    "initial_balances" JSONB NOT NULL,
    "current_balances" JSONB NOT NULL,
    "initialized_at" TIMESTAMP(3) NOT NULL,
    "evaluated_at" TIMESTAMP(3) NOT NULL,
    "wallet_balances" JSONB NOT NULL,
    "wallet_observed_at" TIMESTAMP(3) NOT NULL,
    "reconciled_at" TIMESTAMP(3) NOT NULL,
    "prepared_at" TIMESTAMP(3) NOT NULL,
    "request_fingerprint" CHAR(64) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "real_execution_accounting_ledger_reconciliations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "real_exec_acct_recon_provider_check" CHECK ("provider_id" = 'agentic_wallet'),
    CONSTRAINT "real_exec_acct_recon_chain_check" CHECK ("chain_id" = '56'),
    CONSTRAINT "real_exec_acct_recon_chronology_check" CHECK (
      "evaluated_at" >= "initialized_at"
      AND "wallet_observed_at" <= "reconciled_at"
      AND "reconciled_at" >= "evaluated_at"
      AND "prepared_at" >= "reconciled_at"
      AND "recorded_at" >= "prepared_at"
    )
);

CREATE UNIQUE INDEX "real_exec_acct_recon_fingerprint_key"
ON "real_execution_accounting_ledger_reconciliations"("reconciliation_fingerprint");

CREATE INDEX "real_exec_acct_recon_init_recorded_idx"
ON "real_execution_accounting_ledger_reconciliations"("initialization_id", "recorded_at");

ALTER TABLE "real_execution_accounting_ledger_reconciliations"
ADD CONSTRAINT "real_execution_accounting_ledger_reconciliations_initialization_id_fkey"
FOREIGN KEY ("initialization_id") REFERENCES "real_execution_accounting_balance_initializations"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
