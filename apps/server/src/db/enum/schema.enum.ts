import { pgEnum } from "drizzle-orm/pg-core";

export const facilityType = pgEnum("facility_type", [
    "hospital", 
    "health_center"
]);

export const projectType = pgEnum("project_type", [
    "HIV", 
    "Malaria", 
    "TB"
]);

export const userRole = pgEnum("user_role", [
    "accountant", 
    "admin", 
    "superadmin",
    "program_manager",
    "daf",
    "dg"
]);

export const formFieldType = pgEnum("form_field_type", [
    "text",
    "number",
    "currency",
    "percentage",
    "date",
    "select",
    "multiselect",
    "checkbox",
    "textarea",
    "calculated",
    "readonly"
]);

export const validationType = pgEnum("validation_type", [
    "required",
    "min",
    "max",
    "minLength",
    "maxLength",
    "pattern",
    "custom"
]);

export const mappingType = pgEnum("mapping_type", [
    "DIRECT",
    "COMPUTED",
    "AGGREGATED"
]);

export const reportStatus = pgEnum("report_status", [
    "draft",
    "submitted",
    "approved",
    "rejected",
    "pending_daf_approval",
    "rejected_by_daf",
    "approved_by_daf",
    "rejected_by_dg",
    "fully_approved"
]);

export const moduleType = pgEnum("module_type", [
    "planning",
    "execution",
    "reporting"
]);

export const balanceType = pgEnum("balance_type", [
    "DEBIT",
    "CREDIT",
    "BOTH"
]);

export const eventType = pgEnum("event_type", [
    "REVENUE",
    "EXPENSE",
    "ASSET",
    "LIABILITY",
    "EQUITY"
]);

export const approvalStatus = pgEnum("approval_status", [
    "PENDING",
    "APPROVED",
    "REJECTED",
    "DRAFT"
]);

export const workflowAction = pgEnum("workflow_action", [
    "submitted",
    "daf_approved",
    "daf_rejected",
    "dg_approved",
    "dg_rejected"
]);

export const documentType = pgEnum("document_type", [
    "cash_book",
    "bank_statement",
    "vat_report",
    "invoice",
    "receipt",
    "purchase_order",
    "payment_voucher",
    "journal_entry",
    "ledger",
    "trial_balance",
    "supporting_document",
    "other"
]);

