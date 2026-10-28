ALTER TABLE "real_execution_reservations"
ADD COLUMN "accounting_reconciliation_id" UUID,
ADD COLUMN "accounting_reconciliation_fingerprint" CHAR(64),
ADD COLUMN "provider_observed_at" TIMESTAMP(3),
ADD COLUMN "requirement_valuation_basis" VARCHAR(64),
ADD COLUMN "requirement_valued_at" TIMESTAMP(3);

ALTER TABLE "real_execution_reservations"
ADD CONSTRAINT "real_execution_reservations_provenance_complete_check"
CHECK (
  (
    "accounting_reconciliation_id" IS NULL
    AND "accounting_reconciliation_fingerprint" IS NULL
    AND "provider_observed_at" IS NULL
    AND "requirement_valuation_basis" IS NULL
    AND "requirement_valued_at" IS NULL
  )
  OR
  (
    "accounting_reconciliation_id" IS NOT NULL
    AND "accounting_reconciliation_fingerprint" IS NOT NULL
    AND "provider_observed_at" IS NOT NULL
    AND "requirement_valuation_basis" = 'explicit_external_usd_value'
    AND "requirement_valued_at" IS NOT NULL
  )
);
