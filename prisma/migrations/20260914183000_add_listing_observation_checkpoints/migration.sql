CREATE TABLE "listing_observation_checkpoints" (
    "provider" VARCHAR(30) NOT NULL,
    "symbol" VARCHAR(30) NOT NULL,
    "label" VARCHAR(10) NOT NULL,
    "offset_ms" INTEGER NOT NULL,
    "target_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "listing_observation_checkpoints_pkey" PRIMARY KEY ("provider", "symbol", "label"),
    CONSTRAINT "listing_observation_checkpoints_detection_fkey" FOREIGN KEY ("provider", "symbol") REFERENCES "observed_spot_symbols"("provider", "symbol") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "listing_observation_checkpoints_target_at_provider_symbol_label_idx" ON "listing_observation_checkpoints"("target_at", "provider", "symbol", "label");

INSERT INTO "listing_observation_checkpoints" ("provider", "symbol", "label", "offset_ms", "target_at")
SELECT observed."provider", observed."symbol", checkpoint."label", checkpoint."offset_ms",
       observed."detected_at" + checkpoint."offset_ms" * INTERVAL '1 millisecond'
FROM "observed_spot_symbols" observed
CROSS JOIN (VALUES
  ('T+0', 0), ('T+5s', 5000), ('T+10s', 10000), ('T+30s', 30000),
  ('T+1m', 60000), ('T+5m', 300000), ('T+15m', 900000),
  ('T+1h', 3600000), ('T+24h', 86400000)
) AS checkpoint("label", "offset_ms")
WHERE observed."detected_at" IS NOT NULL;
