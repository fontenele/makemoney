CREATE TABLE "gas_diagnostic_financial_reports" (
  "diagnostic_id" UUID PRIMARY KEY REFERENCES "gas_diagnostics"("id") ON DELETE RESTRICT,
  "fingerprint" CHAR(64) NOT NULL,
  "report" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
