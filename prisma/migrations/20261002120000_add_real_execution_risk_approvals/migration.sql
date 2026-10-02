CREATE TABLE "real_execution_risk_approvals" (
    "id" UUID NOT NULL,
    "reservation_id" UUID NOT NULL,
    "arm_id" UUID NOT NULL,
    "provider_id" VARCHAR(32) NOT NULL,
    "chain_id" VARCHAR(32) NOT NULL,
    "intent_id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "emergency_stop_change_id" VARCHAR(100) NOT NULL,
    "request_fingerprint" CHAR(64) NOT NULL,
    "revalidated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "real_execution_risk_approvals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "real_execution_risk_approvals_reservation_id_key"
ON "real_execution_risk_approvals"("reservation_id");

CREATE UNIQUE INDEX "real_execution_risk_approvals_arm_id_key"
ON "real_execution_risk_approvals"("arm_id");

CREATE UNIQUE INDEX "real_execution_risk_approvals_intent_id_key"
ON "real_execution_risk_approvals"("intent_id");

CREATE UNIQUE INDEX "real_execution_risk_approvals_quote_id_key"
ON "real_execution_risk_approvals"("quote_id");

CREATE INDEX "real_execution_risk_approvals_provider_id_chain_id_expires_at_idx"
ON "real_execution_risk_approvals"("provider_id", "chain_id", "expires_at");

ALTER TABLE "real_execution_risk_approvals"
ADD CONSTRAINT "real_execution_risk_approvals_reservation_id_fkey"
FOREIGN KEY ("reservation_id") REFERENCES "real_execution_reservations"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "real_execution_risk_approvals"
ADD CONSTRAINT "real_execution_risk_approvals_arm_id_fkey"
FOREIGN KEY ("arm_id") REFERENCES "real_execution_arms"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
