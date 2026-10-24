ALTER TABLE "agentic_wallet_funding_conversion_submission_attempts"
ADD COLUMN "provider_fee_rate" VARCHAR(80),
ADD COLUMN "provider_fee_usd" VARCHAR(80),
ADD COLUMN "estimated_network_fee_usd" VARCHAR(80),
ADD COLUMN "fee_evidence_gas_mode" VARCHAR(16),
ADD COLUMN "fee_evidence_observed_at" TIMESTAMP(3);
