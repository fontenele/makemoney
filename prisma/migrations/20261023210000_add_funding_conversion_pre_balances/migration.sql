ALTER TABLE "agentic_wallet_funding_conversion_submission_attempts"
ADD COLUMN "pre_conversion_balance_block_number" VARCHAR(66),
ADD COLUMN "pre_conversion_bnb_balance" TEXT,
ADD COLUMN "pre_conversion_usdt_balance" TEXT,
ADD COLUMN "pre_conversion_balance_observed_at" TIMESTAMP(3);
