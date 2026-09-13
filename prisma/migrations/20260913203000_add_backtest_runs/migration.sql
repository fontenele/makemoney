CREATE TABLE "backtest_runs" (
    "id" UUID NOT NULL,
    "idempotency_key" VARCHAR(100) NOT NULL,
    "request_fingerprint" CHAR(64) NOT NULL,
    "request" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "backtest_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "backtest_runs_idempotency_key_key"
ON "backtest_runs"("idempotency_key");

CREATE INDEX "backtest_runs_created_at_id_idx"
ON "backtest_runs"("created_at", "id");
