ALTER TABLE "listing_observation_checkpoints"
ADD COLUMN "completed_at" TIMESTAMP(3),
ADD CONSTRAINT "listing_observation_checkpoints_completion_time_check"
CHECK (
  "completed_at" IS NULL
  OR (
    "claimed_at" IS NOT NULL
    AND "claim_expires_at" IS NOT NULL
    AND "completed_at" >= "claimed_at"
    AND "completed_at" < "claim_expires_at"
  )
);
