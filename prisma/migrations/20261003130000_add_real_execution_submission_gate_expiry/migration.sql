ALTER TABLE "real_execution_submission_gates"
ADD COLUMN "expires_at" TIMESTAMP(3);

ALTER TABLE "real_execution_submission_gates"
ADD CONSTRAINT "real_execution_submission_gates_expiry_check"
CHECK (
  "expires_at" IS NULL
  OR "expires_at" > "confirmation_consumed_at"
);
