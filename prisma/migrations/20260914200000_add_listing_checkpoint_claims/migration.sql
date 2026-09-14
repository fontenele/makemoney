ALTER TABLE "listing_observation_checkpoints"
ADD COLUMN "claim_token" VARCHAR(100),
ADD COLUMN "claimed_at" TIMESTAMP(3),
ADD COLUMN "claim_expires_at" TIMESTAMP(3),
ADD CONSTRAINT "listing_observation_checkpoints_claim_consistency_check"
CHECK (
  ("claim_token" IS NULL AND "claimed_at" IS NULL AND "claim_expires_at" IS NULL)
  OR
  ("claim_token" IS NOT NULL AND "claimed_at" IS NOT NULL AND "claim_expires_at" > "claimed_at")
);

CREATE INDEX "listing_observation_checkpoints_claim_expires_at_target_at_provider_symbol_label_idx"
ON "listing_observation_checkpoints"("claim_expires_at", "target_at", "provider", "symbol", "label");
