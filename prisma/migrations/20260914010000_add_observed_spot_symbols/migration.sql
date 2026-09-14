CREATE TABLE "observed_spot_symbols" (
    "provider" VARCHAR(30) NOT NULL,
    "symbol" VARCHAR(30) NOT NULL,
    "base_asset" VARCHAR(20) NOT NULL,
    "quote_asset" VARCHAR(20) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "spot_trading_allowed" BOOLEAN NOT NULL,
    "first_observed_at" TIMESTAMP(3) NOT NULL,
    "last_observed_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "observed_spot_symbols_pkey" PRIMARY KEY ("provider", "symbol")
);

CREATE INDEX "observed_spot_symbols_first_observed_at_provider_symbol_idx"
ON "observed_spot_symbols"("first_observed_at", "provider", "symbol");
