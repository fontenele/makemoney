CREATE TABLE "historical_candles" (
    "symbol" VARCHAR(20) NOT NULL,
    "interval" VARCHAR(10) NOT NULL,
    "open_time" TIMESTAMP(3) NOT NULL,
    "close_time" TIMESTAMP(3) NOT NULL,
    "open_price" TEXT NOT NULL,
    "high_price" TEXT NOT NULL,
    "low_price" TEXT NOT NULL,
    "close_price" TEXT NOT NULL,
    "base_volume" TEXT NOT NULL,
    "quote_volume" TEXT NOT NULL,
    "taker_buy_base_volume" TEXT NOT NULL,
    "taker_buy_quote_volume" TEXT NOT NULL,
    "trade_count" BIGINT NOT NULL,
    "is_closed" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historical_candles_pkey"
        PRIMARY KEY ("symbol", "interval", "open_time"),
    CONSTRAINT "historical_candles_identity_check"
        CHECK ("symbol" = 'BTC/USDT' AND "interval" = '1m'),
    CONSTRAINT "historical_candles_time_check"
        CHECK ("close_time" > "open_time"),
    CONSTRAINT "historical_candles_trade_count_check"
        CHECK ("trade_count" >= 0),
    CONSTRAINT "historical_candles_closed_check"
        CHECK ("is_closed")
);
