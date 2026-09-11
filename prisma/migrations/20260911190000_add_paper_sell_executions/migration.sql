ALTER TABLE "paper_executions"
  DROP CONSTRAINT "paper_executions_side_check",
  ALTER COLUMN "total_cost" DROP NOT NULL,
  ADD COLUMN "net_proceeds" DECIMAL(38,18),
  ADD CONSTRAINT "paper_executions_side_check" CHECK ("side" IN ('buy', 'sell')),
  ADD CONSTRAINT "paper_executions_settlement_check" CHECK (
    ("side" = 'buy' AND "total_cost" IS NOT NULL AND "net_proceeds" IS NULL)
    OR
    ("side" = 'sell' AND "total_cost" IS NULL AND "net_proceeds" IS NOT NULL)
  );
