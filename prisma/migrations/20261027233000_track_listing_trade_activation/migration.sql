ALTER TABLE "observed_spot_symbols"
ADD COLUMN "activation_tracking_started_at" TIMESTAMP(3);

UPDATE "observed_spot_symbols"
SET "activation_tracking_started_at" = "detected_at"
WHERE "detected_at" IS NOT NULL;

ALTER TABLE "observed_spot_symbols"
ADD CONSTRAINT "observed_spot_symbols_activation_tracking_chronology_check"
CHECK (
  "activation_tracking_started_at" IS NULL
  OR "activation_tracking_started_at" >= "first_observed_at"
);

ALTER TABLE "observed_spot_symbols"
ADD CONSTRAINT "observed_spot_symbols_detection_activation_check"
CHECK (
  "detected_at" IS NULL
  OR (
    "activation_tracking_started_at" IS NOT NULL
    AND "detected_at" >= "activation_tracking_started_at"
  )
);
