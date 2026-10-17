CREATE TABLE "real_execution_accounting_balance_initializations" (
    "id" UUID NOT NULL,
    "provider_id" VARCHAR(32) NOT NULL,
    "chain_id" VARCHAR(32) NOT NULL,
    "acknowledgment" VARCHAR(96) NOT NULL,
    "balances" JSONB NOT NULL,
    "wallet_observed_at" TIMESTAMP(3) NOT NULL,
    "maximum_observation_age_ms" INTEGER NOT NULL,
    "prepared_at" TIMESTAMP(3) NOT NULL,
    "request_fingerprint" CHAR(64) NOT NULL,
    "initialized_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "real_execution_accounting_balance_initializations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "real_exec_acct_init_age_check" CHECK ("maximum_observation_age_ms" BETWEEN 1 AND 60000),
    CONSTRAINT "real_exec_acct_init_chronology_check" CHECK (
      "prepared_at" >= "wallet_observed_at"
      AND "prepared_at" <= "wallet_observed_at" + ("maximum_observation_age_ms" * INTERVAL '1 millisecond')
      AND "initialized_at" >= "prepared_at"
      AND "initialized_at" <= "wallet_observed_at" + ("maximum_observation_age_ms" * INTERVAL '1 millisecond')
    ),
    CONSTRAINT "real_exec_acct_init_provider_check" CHECK ("provider_id" = 'agentic_wallet'),
    CONSTRAINT "real_exec_acct_init_chain_check" CHECK ("chain_id" = '56')
);

CREATE UNIQUE INDEX "real_exec_acct_init_provider_chain_key"
ON "real_execution_accounting_balance_initializations"("provider_id", "chain_id");

CREATE INDEX "real_exec_acct_init_initialized_at_idx"
ON "real_execution_accounting_balance_initializations"("initialized_at");
