ALTER TABLE "agentic_wallet_funding_conversion_plans"
ADD COLUMN "minimum_gas_reserve_bnb" TEXT,
ADD COLUMN "confirmation_expires_at" TIMESTAMP(3);

UPDATE "agentic_wallet_funding_conversion_plans"
SET "confirmation_expires_at" = "quote_expires_at"
WHERE "confirmation_expires_at" IS NULL;

ALTER TABLE "agentic_wallet_funding_conversion_plans"
ALTER COLUMN "confirmation_expires_at" SET NOT NULL;
