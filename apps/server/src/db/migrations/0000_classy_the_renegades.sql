CREATE TYPE "public"."approval_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'DRAFT');--> statement-breakpoint
CREATE TYPE "public"."balance_type" AS ENUM('DEBIT', 'CREDIT', 'BOTH');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('REVENUE', 'EXPENSE', 'ASSET', 'LIABILITY', 'EQUITY');--> statement-breakpoint
CREATE TYPE "public"."facility_type" AS ENUM('hospital', 'health_center');--> statement-breakpoint
CREATE TYPE "public"."form_field_type" AS ENUM('text', 'number', 'currency', 'percentage', 'date', 'select', 'multiselect', 'checkbox', 'textarea', 'calculated', 'readonly');--> statement-breakpoint
CREATE TYPE "public"."mapping_type" AS ENUM('DIRECT', 'COMPUTED', 'AGGREGATED');--> statement-breakpoint
CREATE TYPE "public"."module_type" AS ENUM('planning', 'execution', 'reporting');--> statement-breakpoint
CREATE TYPE "public"."project_type" AS ENUM('HIV', 'Malaria', 'TB');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('draft', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('accountant', 'admin', 'superadmin', 'program_manager');--> statement-breakpoint
CREATE TYPE "public"."validation_type" AS ENUM('required', 'min', 'max', 'minLength', 'maxLength', 'pattern', 'custom');--> statement-breakpoint
CREATE TABLE "account" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" integer NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"planning_id" integer NOT NULL,
	"previous_status" "approval_status",
	"new_status" "approval_status" NOT NULL,
	"action_by" integer NOT NULL,
	"action_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"comments" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "configurable_event_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"activity_id" integer,
	"category_id" integer,
	"project_type" "project_type",
	"facility_type" "facility_type",
	"mapping_type" "mapping_type" DEFAULT 'DIRECT',
	"mapping_formula" text,
	"mapping_ratio" numeric(10, 4) DEFAULT '1.0000',
	"is_active" boolean DEFAULT true,
	"effective_from" timestamp,
	"effective_to" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "configurable_event_mappings_unique_key" UNIQUE("event_id","activity_id","category_id","project_type","facility_type")
);
--> statement-breakpoint
CREATE TABLE "configuration_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"record_id" integer NOT NULL,
	"operation" varchar(20) NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"changed_by" integer NOT NULL,
	"change_reason" text,
	"changed_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"province_id" integer NOT NULL,
	CONSTRAINT "districts_name_province_id_key" UNIQUE("name","province_id")
);
--> statement-breakpoint
CREATE TABLE "dynamic_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"project_type" "project_type",
	"facility_type" "facility_type",
	"module_type" "module_type",
	"code" varchar(100),
	"name" varchar(300) NOT NULL,
	"description" text,
	"activity_type" varchar(100),
	"display_order" integer NOT NULL,
	"is_total_row" boolean DEFAULT false,
	"is_annual_only" boolean DEFAULT false,
	"field_mappings" jsonb,
	"computation_rules" jsonb,
	"validation_rules" jsonb,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "dynamic_activities_category_code" UNIQUE("category_id","code")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"note_number" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"statement_codes" text[] NOT NULL,
	"balance_type" "balance_type" NOT NULL,
	"event_type" "event_type" NOT NULL,
	"display_order" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "events_note_number_key" UNIQUE("note_number"),
	CONSTRAINT "events_code_key" UNIQUE("code"),
	CONSTRAINT "events_event_type_check" CHECK ((event_type)::text = ANY (ARRAY[('REVENUE'::character varying)::text, ('EXPENSE'::character varying)::text, ('ASSET'::character varying)::text, ('LIABILITY'::character varying)::text, ('EQUITY'::character varying)::text]))
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"facility_type" "facility_type" NOT NULL,
	"district_id" integer NOT NULL,
	CONSTRAINT "facilities_name_district_id_key" UNIQUE("name","district_id")
);
--> statement-breakpoint
CREATE TABLE "financial_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_code" varchar(50) NOT NULL,
	"title" varchar(300) NOT NULL,
	"project_id" integer NOT NULL,
	"facility_id" integer NOT NULL,
	"reporting_period_id" integer NOT NULL,
	"version" varchar(20) DEFAULT '1.0',
	"fiscal_year" varchar(10) NOT NULL,
	"status" "report_status" DEFAULT 'draft',
	"report_data" jsonb NOT NULL,
	"metadata" jsonb,
	"computed_totals" jsonb,
	"validation_results" jsonb,
	"created_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"submitted_by" integer,
	"submitted_at" timestamp,
	"approved_by" integer,
	"approved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "form_fields" (
	"id" serial PRIMARY KEY NOT NULL,
	"schema_id" integer NOT NULL,
	"field_key" varchar(100) NOT NULL,
	"label" varchar(200) NOT NULL,
	"field_type" "form_field_type" NOT NULL,
	"is_required" boolean DEFAULT false,
	"display_order" integer NOT NULL,
	"parent_field_id" integer,
	"category_id" integer,
	"field_config" jsonb,
	"validation_rules" jsonb,
	"computation_formula" text,
	"default_value" jsonb,
	"help_text" text,
	"is_visible" boolean DEFAULT true,
	"is_editable" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "form_schemas" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"version" varchar(20) NOT NULL,
	"project_type" "project_type",
	"facility_type" "facility_type",
	"module_type" "module_type" NOT NULL,
	"is_active" boolean DEFAULT true,
	"schema" jsonb NOT NULL,
	"metadata" jsonb,
	"created_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "schema_activity_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_type" "project_type",
	"facility_type" "facility_type",
	"code" varchar(50) NOT NULL,
	"sub_category_code" varchar(50),
	"name" varchar(200) NOT NULL,
	"description" text,
	"module_type" "module_type" NOT NULL,
	"display_order" integer NOT NULL,
	"parent_category_id" integer,
	"is_sub_category" boolean DEFAULT false,
	"is_computed" boolean DEFAULT false,
	"computation_formula" text,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "schema_categories_type_code" UNIQUE("project_type","facility_type","code","module_type")
);
--> statement-breakpoint
CREATE TABLE "schema_form_data_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"schema_id" integer NOT NULL,
	"entity_id" integer,
	"entity_type" varchar(50) NOT NULL,
	"project_id" integer NOT NULL,
	"facility_id" integer NOT NULL,
	"reporting_period_id" integer NOT NULL,
	"form_data" jsonb NOT NULL,
	"computed_values" jsonb,
	"validation_state" jsonb,
	"metadata" jsonb,
	"approval_status" "approval_status" DEFAULT 'PENDING',
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"review_comments" text,
	"source_file_name" text,
	"source_file_url" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "unique_planning_entry" UNIQUE("facility_id","project_id","entity_type","reporting_period_id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" serial PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" integer NOT NULL,
	"impersonated_by" text,
	"active_organization_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" "user_role" NOT NULL,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"facility_id" integer,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"project_access" jsonb DEFAULT '[]'::jsonb,
	"config_access" text,
	"last_login_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"must_change_password" boolean DEFAULT true,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE',
	"code" varchar(10) NOT NULL,
	"description" text,
	"project_type" "project_type",
	"facility_id" integer,
	"reporting_period_id" integer,
	"user_id" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "projects_name_key" UNIQUE("name"),
	CONSTRAINT "projects_code_key" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "provinces" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "provinces_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "reporting_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"period_type" varchar(20) DEFAULT 'ANNUAL',
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "reporting_periods_year_period_type_key" UNIQUE("year","period_type")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" serial PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_key" varchar(100) NOT NULL,
	"config_value" jsonb NOT NULL,
	"description" text,
	"config_type" varchar(50) NOT NULL,
	"scope" varchar(50) DEFAULT 'GLOBAL',
	"scope_id" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "statement_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"statement_code" varchar(50) NOT NULL,
	"statement_name" varchar(200) NOT NULL,
	"line_item" varchar(300) NOT NULL,
	"line_code" varchar(50) NOT NULL,
	"parent_line_id" integer,
	"display_order" integer NOT NULL,
	"level" integer DEFAULT 1,
	"event_mappings" jsonb DEFAULT '[]' NOT NULL,
	"calculation_formula" text,
	"aggregation_method" varchar(50) DEFAULT 'SUM' NOT NULL,
	"is_total_line" boolean DEFAULT false NOT NULL,
	"is_subtotal_line" boolean DEFAULT false NOT NULL,
	"display_conditions" jsonb DEFAULT '{}' NOT NULL,
	"format_rules" jsonb DEFAULT '{}' NOT NULL,
	"columns" jsonb DEFAULT '[]' NOT NULL,
	"validation_rules" jsonb DEFAULT '[]' NOT NULL,
	"statement_metadata" jsonb DEFAULT '{}' NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"status" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"inviter_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_audit_log" ADD CONSTRAINT "approval_audit_log_planning_id_fkey" FOREIGN KEY ("planning_id") REFERENCES "public"."schema_form_data_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_audit_log" ADD CONSTRAINT "approval_audit_log_action_by_fkey" FOREIGN KEY ("action_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configurable_event_mappings" ADD CONSTRAINT "configurable_event_mappings_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configurable_event_mappings" ADD CONSTRAINT "configurable_event_mappings_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."dynamic_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configurable_event_mappings" ADD CONSTRAINT "configurable_event_mappings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."schema_activity_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuration_audit_log" ADD CONSTRAINT "configuration_audit_log_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dynamic_activities" ADD CONSTRAINT "dynamic_activities_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."schema_activity_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_reports" ADD CONSTRAINT "financial_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_reports" ADD CONSTRAINT "financial_reports_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_reports" ADD CONSTRAINT "financial_reports_reporting_period_id_fkey" FOREIGN KEY ("reporting_period_id") REFERENCES "public"."reporting_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_reports" ADD CONSTRAINT "financial_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_schema_id_fkey" FOREIGN KEY ("schema_id") REFERENCES "public"."form_schemas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_parent_field_id_fkey" FOREIGN KEY ("parent_field_id") REFERENCES "public"."form_fields"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_schemas" ADD CONSTRAINT "form_schemas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_activity_categories" ADD CONSTRAINT "schema_activity_categories_parent_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "public"."schema_activity_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_form_data_entries" ADD CONSTRAINT "schema_form_data_entries_schema_id_fkey" FOREIGN KEY ("schema_id") REFERENCES "public"."form_schemas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_form_data_entries" ADD CONSTRAINT "schema_form_data_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_form_data_entries" ADD CONSTRAINT "schema_form_data_entries_user_id_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_form_data_entries" ADD CONSTRAINT "schema_form_data_entries_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_form_data_entries" ADD CONSTRAINT "schema_form_data_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_reporting_period_id_fkey" FOREIGN KEY ("reporting_period_id") REFERENCES "public"."reporting_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement_templates" ADD CONSTRAINT "statement_templates_parent_line_id_fkey" FOREIGN KEY ("parent_line_id") REFERENCES "public"."statement_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "form_schemas_unique_idx" ON "form_schemas" USING btree ("name","version","project_type","facility_type","module_type");