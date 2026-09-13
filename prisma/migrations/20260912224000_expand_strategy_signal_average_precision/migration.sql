ALTER TABLE "strategy_signals"
    ALTER COLUMN "previous_short_average" TYPE DECIMAL(65,40),
    ALTER COLUMN "previous_long_average" TYPE DECIMAL(65,40),
    ALTER COLUMN "current_short_average" TYPE DECIMAL(65,40),
    ALTER COLUMN "current_long_average" TYPE DECIMAL(65,40);
