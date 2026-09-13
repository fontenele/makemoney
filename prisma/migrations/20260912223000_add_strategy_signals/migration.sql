CREATE TABLE "strategy_signals" (
    "id" UUID NOT NULL,
    "strategy" VARCHAR(100) NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "action" VARCHAR(10) NOT NULL,
    "reason" VARCHAR(100) NOT NULL,
    "short_period" INTEGER NOT NULL,
    "long_period" INTEGER NOT NULL,
    "previous_short_average" DECIMAL(38,18),
    "previous_long_average" DECIMAL(38,18),
    "current_short_average" DECIMAL(38,18),
    "current_long_average" DECIMAL(38,18),
    "latest_candle_close_time" TIMESTAMP(3),
    "evaluated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategy_signals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "strategy_signals_periods_check" CHECK (
        "short_period" > 0 AND "long_period" > "short_period"
    )
);

CREATE UNIQUE INDEX "strategy_signals_strategy_symbol_latest_candle_close_time_key"
ON "strategy_signals"("strategy", "symbol", "latest_candle_close_time");

CREATE INDEX "strategy_signals_evaluated_at_id_idx"
ON "strategy_signals"("evaluated_at", "id");
