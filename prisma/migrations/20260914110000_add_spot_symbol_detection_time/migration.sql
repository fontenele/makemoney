ALTER TABLE "observed_spot_symbols"
ADD COLUMN "detected_at" TIMESTAMP(3);

CREATE INDEX "observed_spot_symbols_detected_at_provider_symbol_idx"
ON "observed_spot_symbols"("detected_at", "provider", "symbol");
