ALTER TABLE "listing_observation_checkpoints"
ADD COLUMN "last_price" DECIMAL(38, 18),
ADD COLUMN "base_volume" DECIMAL(38, 18),
ADD COLUMN "quote_volume" DECIMAL(38, 18),
ADD COLUMN "trade_count" BIGINT,
ADD COLUMN "window_open_time" TIMESTAMP(3),
ADD COLUMN "window_close_time" TIMESTAMP(3),
ADD COLUMN "received_at" TIMESTAMP(3);

-- Completions created before observations existed certify only the old lease
-- lifecycle. Reopen them so a future processor can collect real market data.
UPDATE "listing_observation_checkpoints"
SET
  "completed_at" = NULL,
  "claim_token" = NULL,
  "claimed_at" = NULL,
  "claim_expires_at" = NULL
WHERE "completed_at" IS NOT NULL;

ALTER TABLE "listing_observation_checkpoints"
ADD CONSTRAINT "listing_observation_checkpoints_observation_consistency_check"
CHECK (
  (
    "completed_at" IS NULL
    AND "last_price" IS NULL
    AND "base_volume" IS NULL
    AND "quote_volume" IS NULL
    AND "trade_count" IS NULL
    AND "window_open_time" IS NULL
    AND "window_close_time" IS NULL
    AND "received_at" IS NULL
  )
  OR (
    "completed_at" IS NOT NULL
    AND "last_price" IS NOT NULL
    AND "last_price" > 0
    AND "base_volume" IS NOT NULL
    AND "base_volume" >= 0
    AND "quote_volume" IS NOT NULL
    AND "quote_volume" >= 0
    AND "trade_count" IS NOT NULL
    AND "trade_count" >= 0
    AND "window_open_time" IS NOT NULL
    AND "window_close_time" IS NOT NULL
    AND "window_close_time" >= "window_open_time"
    AND "received_at" IS NOT NULL
  )
);
