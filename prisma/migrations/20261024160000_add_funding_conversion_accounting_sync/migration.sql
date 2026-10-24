CREATE TABLE "agentic_wallet_funding_conversion_accounting_syncs" (
    "id" UUID NOT NULL,
    "initialization_id" UUID NOT NULL,
    "reconciliation_id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "transaction_hash" VARCHAR(66) NOT NULL,
    "wallet_address" VARCHAR(42) NOT NULL,
    "block_number" VARCHAR(66) NOT NULL,
    "acknowledgment" VARCHAR(112) NOT NULL,
    "balances" JSONB NOT NULL,
    "observed_at" TIMESTAMP(3) NOT NULL,
    "prepared_at" TIMESTAMP(3) NOT NULL,
    "request_fingerprint" CHAR(64) NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agentic_wallet_funding_conversion_accounting_syncs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "funding_conversion_acct_sync_chronology_check" CHECK ("prepared_at" >= "observed_at" AND "applied_at" >= "prepared_at"),
    CONSTRAINT "funding_conversion_acct_sync_retry_ack_check" CHECK ("acknowledgment" = 'reconciled_conversion_and_exact_wallet_balances_reviewed_for_local_ledger_synchronization'),
    CONSTRAINT "funding_conversion_acct_sync_wallet_check" CHECK ("wallet_address" ~ '^0x[0-9a-f]{40}$'),
    CONSTRAINT "funding_conversion_acct_sync_block_check" CHECK ("block_number" ~ '^0x(0|[1-9a-f][0-9a-f]*)$'),
    CONSTRAINT "funding_conversion_acct_sync_fingerprint_check" CHECK ("request_fingerprint" ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX "funding_conversion_acct_sync_recon_key" ON "agentic_wallet_funding_conversion_accounting_syncs"("reconciliation_id");
CREATE UNIQUE INDEX "funding_conversion_acct_sync_attempt_key" ON "agentic_wallet_funding_conversion_accounting_syncs"("attempt_id");
CREATE UNIQUE INDEX "funding_conversion_acct_sync_tx_key" ON "agentic_wallet_funding_conversion_accounting_syncs"("transaction_hash");
CREATE INDEX "funding_conversion_acct_sync_init_idx" ON "agentic_wallet_funding_conversion_accounting_syncs"("initialization_id", "applied_at");

ALTER TABLE "agentic_wallet_funding_conversion_accounting_syncs"
ADD CONSTRAINT "funding_conversion_acct_sync_init_fkey"
FOREIGN KEY ("initialization_id") REFERENCES "real_execution_accounting_balance_initializations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "agentic_wallet_funding_conversion_accounting_syncs"
ADD CONSTRAINT "funding_conversion_acct_sync_recon_fkey"
FOREIGN KEY ("reconciliation_id") REFERENCES "agentic_wallet_funding_conversion_financial_reconciliations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
