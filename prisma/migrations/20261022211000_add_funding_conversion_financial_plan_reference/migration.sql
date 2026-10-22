ALTER TABLE "agentic_wallet_funding_conversion_financial_reconciliations"
ADD CONSTRAINT "funding_conversion_financial_plan_fkey"
FOREIGN KEY ("plan_id") REFERENCES "agentic_wallet_funding_conversion_plans"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
