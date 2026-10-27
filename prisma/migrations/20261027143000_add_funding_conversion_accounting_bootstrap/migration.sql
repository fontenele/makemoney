CREATE TABLE "agentic_wallet_funding_conversion_accounting_bootstraps" (
    "id" UUID NOT NULL,
    "initialization_id" UUID NOT NULL,
    "reconciliation_id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "transaction_hash" VARCHAR(66) NOT NULL,
    "wallet_address" VARCHAR(42) NOT NULL,
    "block_number" VARCHAR(66) NOT NULL,
    "acknowledgment" VARCHAR(96) NOT NULL,
    "reason" VARCHAR(64) NOT NULL,
    "balances" JSONB NOT NULL,
    "wallet_observed_at" TIMESTAMP(3) NOT NULL,
    "accounting_state_inspected_at" TIMESTAMP(3) NOT NULL,
    "maximum_snapshot_age_ms" INTEGER NOT NULL,
    "prepared_at" TIMESTAMP(3) NOT NULL,
    "historical_ledger_continuity_claimed" BOOLEAN NOT NULL,
    "historical_btcb_continuity_claimed" BOOLEAN NOT NULL,
    "request_fingerprint" CHAR(64) NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agentic_wallet_funding_conversion_accounting_bootstraps_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "funding_conversion_acct_bootstrap_ack_check" CHECK ("acknowledgment" = 'reconciled_conversion_and_current_wallet_balances_reviewed_for_accounting_bootstrap'),
    CONSTRAINT "funding_conversion_acct_bootstrap_reason_check" CHECK ("reason" = 'post_reconciliation_missing_preexisting_ledger'),
    CONSTRAINT "funding_conversion_acct_bootstrap_chronology_check" CHECK ("prepared_at" >= "wallet_observed_at" AND "prepared_at" >= "accounting_state_inspected_at" AND "applied_at" >= "prepared_at"),
    CONSTRAINT "funding_conversion_acct_bootstrap_age_check" CHECK ("maximum_snapshot_age_ms" BETWEEN 1 AND 60000),
    CONSTRAINT "funding_conversion_acct_bootstrap_history_check" CHECK ("historical_ledger_continuity_claimed" = FALSE AND "historical_btcb_continuity_claimed" = FALSE),
    CONSTRAINT "funding_conversion_acct_bootstrap_wallet_check" CHECK ("wallet_address" ~ '^0x[0-9a-f]{40}$'),
    CONSTRAINT "funding_conversion_acct_bootstrap_block_check" CHECK ("block_number" ~ '^0x(0|[1-9a-f][0-9a-f]*)$'),
    CONSTRAINT "funding_conversion_acct_bootstrap_fingerprint_check" CHECK ("request_fingerprint" ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX "funding_conversion_acct_bootstrap_init_key" ON "agentic_wallet_funding_conversion_accounting_bootstraps"("initialization_id");
CREATE UNIQUE INDEX "funding_conversion_acct_bootstrap_recon_key" ON "agentic_wallet_funding_conversion_accounting_bootstraps"("reconciliation_id");
CREATE UNIQUE INDEX "funding_conversion_acct_bootstrap_attempt_key" ON "agentic_wallet_funding_conversion_accounting_bootstraps"("attempt_id");
CREATE UNIQUE INDEX "funding_conversion_acct_bootstrap_tx_key" ON "agentic_wallet_funding_conversion_accounting_bootstraps"("transaction_hash");
CREATE INDEX "funding_conversion_acct_bootstrap_applied_idx" ON "agentic_wallet_funding_conversion_accounting_bootstraps"("applied_at");

ALTER TABLE "agentic_wallet_funding_conversion_accounting_bootstraps"
ADD CONSTRAINT "funding_conversion_acct_bootstrap_init_fkey"
FOREIGN KEY ("initialization_id") REFERENCES "real_execution_accounting_balance_initializations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "agentic_wallet_funding_conversion_accounting_bootstraps"
ADD CONSTRAINT "funding_conversion_acct_bootstrap_recon_fkey"
FOREIGN KEY ("reconciliation_id") REFERENCES "agentic_wallet_funding_conversion_financial_reconciliations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
