CREATE TABLE "paper_balances" (
    "asset" VARCHAR(10) NOT NULL,
    "amount" DECIMAL(38,18) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paper_balances_pkey" PRIMARY KEY ("asset"),
    CONSTRAINT "paper_balances_asset_check" CHECK ("asset" IN ('BTC', 'USDT')),
    CONSTRAINT "paper_balances_amount_check" CHECK ("amount" >= 0)
);
