CREATE TABLE "risk_control_events" (
    "id" VARCHAR(100) NOT NULL,
    "control" VARCHAR(50) NOT NULL,
    "active" BOOLEAN NOT NULL,
    "reason" VARCHAR(200) NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_control_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "risk_control_events_control_check" CHECK ("control" = 'emergency_stop'),
    CONSTRAINT "risk_control_events_reason_check" CHECK (length(trim("reason")) > 0)
);

CREATE INDEX "risk_control_events_control_changed_at_id_idx"
ON "risk_control_events"("control", "changed_at", "id");
