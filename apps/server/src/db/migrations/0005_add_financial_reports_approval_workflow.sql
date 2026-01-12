-- Add approval workflow columns to financial_reports table
ALTER TABLE "financial_reports"
ADD COLUMN IF NOT EXISTS "daf_id" integer,
ADD COLUMN IF NOT EXISTS "daf_approved_at" timestamp,
ADD COLUMN IF NOT EXISTS "daf_comment" text,
ADD COLUMN IF NOT EXISTS "dg_id" integer,
ADD COLUMN IF NOT EXISTS "dg_approved_at" timestamp,
ADD COLUMN IF NOT EXISTS "dg_comment" text,
ADD COLUMN IF NOT EXISTS "final_pdf_url" text,
ADD COLUMN IF NOT EXISTS "locked" boolean DEFAULT false;

-- Add foreign key constraints for DAF and DG approvers
DO $$ BEGIN
 ALTER TABLE "financial_reports" ADD CONSTRAINT "financial_reports_daf_id_fkey" FOREIGN KEY ("daf_id") REFERENCES "users"("id");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "financial_reports" ADD CONSTRAINT "financial_reports_dg_id_fkey" FOREIGN KEY ("dg_id") REFERENCES "users"("id");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Update report_status enum to include new approval statuses
-- Note: PostgreSQL doesn't support adding multiple values at once, so we add them one by one
DO $$ BEGIN
 ALTER TYPE "report_status" ADD VALUE IF NOT EXISTS 'pending_daf_approval';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TYPE "report_status" ADD VALUE IF NOT EXISTS 'rejected_by_daf';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TYPE "report_status" ADD VALUE IF NOT EXISTS 'approved_by_daf';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TYPE "report_status" ADD VALUE IF NOT EXISTS 'rejected_by_dg';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TYPE "report_status" ADD VALUE IF NOT EXISTS 'fully_approved';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create financial_report_workflow_logs table
CREATE TABLE IF NOT EXISTS "financial_report_workflow_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"actor_id" integer NOT NULL,
	"comment" text,
	"timestamp" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add foreign key constraints for workflow logs
DO $$ BEGIN
 ALTER TABLE "financial_report_workflow_logs" ADD CONSTRAINT "financial_report_workflow_logs_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "financial_reports"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "financial_report_workflow_logs" ADD CONSTRAINT "financial_report_workflow_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add indexes for workflow logs performance
CREATE INDEX IF NOT EXISTS "idx_financial_report_workflow_logs_report_id" ON "financial_report_workflow_logs" ("report_id");
CREATE INDEX IF NOT EXISTS "idx_financial_report_workflow_logs_timestamp" ON "financial_report_workflow_logs" ("timestamp");
CREATE INDEX IF NOT EXISTS "idx_financial_report_workflow_logs_actor_id" ON "financial_report_workflow_logs" ("actor_id");

-- Add indexes for financial_reports approval columns for better query performance
CREATE INDEX IF NOT EXISTS "idx_financial_reports_status" ON "financial_reports" ("status");
CREATE INDEX IF NOT EXISTS "idx_financial_reports_locked" ON "financial_reports" ("locked");
CREATE INDEX IF NOT EXISTS "idx_financial_reports_daf_id" ON "financial_reports" ("daf_id");
CREATE INDEX IF NOT EXISTS "idx_financial_reports_dg_id" ON "financial_reports" ("dg_id");
