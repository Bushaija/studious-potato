-- Migration: Add Snapshot and Period Locking Features
-- This migration adds support for immutable financial report snapshots and period locking

-- Step 1: Add snapshot-related columns to financial_reports table
ALTER TABLE "financial_reports"
ADD COLUMN IF NOT EXISTS "snapshot_checksum" varchar(64),
ADD COLUMN IF NOT EXISTS "snapshot_timestamp" timestamp,
ADD COLUMN IF NOT EXISTS "source_data_version" varchar(20),
ADD COLUMN IF NOT EXISTS "is_outdated" boolean DEFAULT false;

-- Step 2: Create report_versions table for version control
CREATE TABLE IF NOT EXISTS "report_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL,
	"version_number" varchar(20) NOT NULL,
	"snapshot_data" jsonb NOT NULL,
	"snapshot_checksum" varchar(64) NOT NULL,
	"snapshot_timestamp" timestamp NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"changes_summary" text
);

-- Add foreign key constraints for report_versions
DO $$ BEGIN
 ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "financial_reports"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add unique constraint for report_id and version_number combination
DO $$ BEGIN
 ALTER TABLE "report_versions" ADD CONSTRAINT "report_version_unique" UNIQUE ("report_id", "version_number");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Step 3: Create period_locks table
CREATE TABLE IF NOT EXISTS "period_locks" (
	"id" serial PRIMARY KEY NOT NULL,
	"reporting_period_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"facility_id" integer NOT NULL,
	"is_locked" boolean DEFAULT true,
	"locked_by" integer,
	"locked_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"locked_reason" text,
	"unlocked_by" integer,
	"unlocked_at" timestamp,
	"unlocked_reason" text
);

-- Add foreign key constraints for period_locks
DO $$ BEGIN
 ALTER TABLE "period_locks" ADD CONSTRAINT "period_locks_reporting_period_id_fkey" FOREIGN KEY ("reporting_period_id") REFERENCES "reporting_periods"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "period_locks" ADD CONSTRAINT "period_locks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "period_locks" ADD CONSTRAINT "period_locks_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "period_locks" ADD CONSTRAINT "period_locks_locked_by_fkey" FOREIGN KEY ("locked_by") REFERENCES "users"("id");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "period_locks" ADD CONSTRAINT "period_locks_unlocked_by_fkey" FOREIGN KEY ("unlocked_by") REFERENCES "users"("id");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add unique constraint for period/project/facility combination
DO $$ BEGIN
 ALTER TABLE "period_locks" ADD CONSTRAINT "period_lock_unique" UNIQUE ("reporting_period_id", "project_id", "facility_id");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Step 4: Create period_lock_audit_log table
CREATE TABLE IF NOT EXISTS "period_lock_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_lock_id" integer NOT NULL,
	"action" varchar(20) NOT NULL,
	"performed_by" integer NOT NULL,
	"performed_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"reason" text,
	"metadata" jsonb
);

-- Add foreign key constraints for period_lock_audit_log
DO $$ BEGIN
 ALTER TABLE "period_lock_audit_log" ADD CONSTRAINT "period_lock_audit_log_period_lock_id_fkey" FOREIGN KEY ("period_lock_id") REFERENCES "period_locks"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "period_lock_audit_log" ADD CONSTRAINT "period_lock_audit_log_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Step 5: Add indexes for performance optimization

-- Indexes for financial_reports snapshot columns
CREATE INDEX IF NOT EXISTS "idx_financial_reports_snapshot_timestamp" ON "financial_reports" ("snapshot_timestamp");
CREATE INDEX IF NOT EXISTS "idx_financial_reports_is_outdated" ON "financial_reports" ("is_outdated");

-- Indexes for report_versions
CREATE INDEX IF NOT EXISTS "idx_report_versions_report_id" ON "report_versions" ("report_id");
CREATE INDEX IF NOT EXISTS "idx_report_versions_version_number" ON "report_versions" ("version_number");
CREATE INDEX IF NOT EXISTS "idx_report_versions_snapshot_timestamp" ON "report_versions" ("snapshot_timestamp");

-- Indexes for period_locks
CREATE INDEX IF NOT EXISTS "idx_period_locks_reporting_period_id" ON "period_locks" ("reporting_period_id");
CREATE INDEX IF NOT EXISTS "idx_period_locks_project_id" ON "period_locks" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_period_locks_facility_id" ON "period_locks" ("facility_id");
CREATE INDEX IF NOT EXISTS "idx_period_locks_is_locked" ON "period_locks" ("is_locked");
CREATE INDEX IF NOT EXISTS "idx_period_locks_locked_at" ON "period_locks" ("locked_at");

-- Composite index for common query pattern (checking if a specific period is locked)
CREATE INDEX IF NOT EXISTS "idx_period_locks_lookup" ON "period_locks" ("reporting_period_id", "project_id", "facility_id", "is_locked");

-- Indexes for period_lock_audit_log
CREATE INDEX IF NOT EXISTS "idx_period_lock_audit_log_period_lock_id" ON "period_lock_audit_log" ("period_lock_id");
CREATE INDEX IF NOT EXISTS "idx_period_lock_audit_log_performed_by" ON "period_lock_audit_log" ("performed_by");
CREATE INDEX IF NOT EXISTS "idx_period_lock_audit_log_performed_at" ON "period_lock_audit_log" ("performed_at");
CREATE INDEX IF NOT EXISTS "idx_period_lock_audit_log_action" ON "period_lock_audit_log" ("action");
