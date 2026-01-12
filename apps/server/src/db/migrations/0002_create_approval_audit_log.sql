-- Create approval audit log table for immutable audit trail
CREATE TABLE IF NOT EXISTS "approval_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"planning_id" integer NOT NULL,
	"previous_status" "approval_status",
	"new_status" "approval_status" NOT NULL,
	"action_by" integer NOT NULL,
	"action_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"comments" text,
	"metadata" jsonb
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "approval_audit_log" ADD CONSTRAINT "approval_audit_log_planning_id_fkey" FOREIGN KEY ("planning_id") REFERENCES "schema_form_data_entries"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "approval_audit_log" ADD CONSTRAINT "approval_audit_log_action_by_fkey" FOREIGN KEY ("action_by") REFERENCES "users"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "idx_approval_audit_log_planning_id" ON "approval_audit_log" ("planning_id");
CREATE INDEX IF NOT EXISTS "idx_approval_audit_log_action_by" ON "approval_audit_log" ("action_by");
CREATE INDEX IF NOT EXISTS "idx_approval_audit_log_action_at" ON "approval_audit_log" ("action_at");
CREATE INDEX IF NOT EXISTS "idx_approval_audit_log_new_status" ON "approval_audit_log" ("new_status");