CREATE TABLE "paper_executions" (
    "id" VARCHAR(100) NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "side" VARCHAR(10) NOT NULL,
    "quantity" DECIMAL(38,18) NOT NULL,
    "price" DECIMAL(38,18) NOT NULL,
    "notional" DECIMAL(38,18) NOT NULL,
    "fee_rate" DECIMAL(38,18) NOT NULL,
    "fee" DECIMAL(38,18) NOT NULL,
    "total_cost" DECIMAL(38,18) NOT NULL,
    "quoted_at" TIMESTAMP(3) NOT NULL,
    "market_data_received_at" TIMESTAMP(3) NOT NULL,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "paper_executions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "paper_executions_symbol_check" CHECK ("symbol" = 'BTC/USDT'),
    CONSTRAINT "paper_executions_side_check" CHECK ("side" = 'buy')
);
