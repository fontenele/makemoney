ALTER TABLE "agentic_wallet_funding_conversion_submission_attempts"
ADD COLUMN "fresh_source_quantity_bnb" TEXT NOT NULL,
ADD COLUMN "fresh_maximum_slippage_percent" TEXT NOT NULL;
