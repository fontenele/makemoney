ALTER TABLE "real_execution_arms"
ADD COLUMN "payload_commitment_version" VARCHAR(64),
ADD COLUMN "payload_commitment_digest" CHAR(64);

ALTER TABLE "real_execution_arms"
ADD CONSTRAINT "real_execution_arms_payload_commitment_pair_check"
CHECK (
  (
    "payload_commitment_version" IS NULL
    AND "payload_commitment_digest" IS NULL
  )
  OR (
    "payload_commitment_version" = 'real_execution_intent_quote_v1'
    AND "payload_commitment_digest" ~ '^[0-9a-f]{64}$'
  )
);
