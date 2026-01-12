import { 
    integer, 
    pgTable, 
    serial, 
    timestamp, 
    varchar,
    text,
    boolean,
    jsonb,
    foreignKey
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { documentType } from "../../enum/schema.enum";
import { schemaFormDataEntries } from "../schema-form-data-entries/schema";
import { users } from "../users/schema";

export const documents = pgTable("documents", {
    id: serial().primaryKey().notNull(),
    
    // Document identification
    documentCode: varchar("document_code", { length: 50 }).notNull().unique(),
    documentName: varchar("document_name", { length: 255 }).notNull(),
    documentType: documentType("document_type").notNull(),
    description: text("description"),
    
    // File information
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileSize: integer("file_size").notNull(), // in bytes
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    fileUrl: text("file_url").notNull(), // Storage path or URL
    
    // Relationship - execution entry specific
    executionEntryId: integer("execution_entry_id").notNull(), // Links to execution entry only
    
    // Metadata
    metadata: jsonb("metadata"), // Additional document metadata (tags, custom fields, etc.)
    
    // Verification and validation
    isVerified: boolean("is_verified").default(false),
    verifiedBy: integer("verified_by"),
    verifiedAt: timestamp("verified_at", { mode: 'date' }),
    verificationNotes: text("verification_notes"),
    
    // Audit trail
    uploadedBy: integer("uploaded_by").notNull(),
    uploadedAt: timestamp("uploaded_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedBy: integer("updated_by"),
    updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
    
    // Soft delete
    isDeleted: boolean("is_deleted").default(false),
    deletedBy: integer("deleted_by"),
    deletedAt: timestamp("deleted_at", { mode: 'date' }),
    deletionReason: text("deletion_reason"),
    
}, (table) => [
    foreignKey({
        columns: [table.executionEntryId],
        foreignColumns: [schemaFormDataEntries.id],
        name: "documents_execution_entry_id_fkey"
    }).onDelete("cascade"),
    foreignKey({
        columns: [table.uploadedBy],
        foreignColumns: [users.id],
        name: "documents_uploaded_by_fkey"
    }),
    foreignKey({
        columns: [table.verifiedBy],
        foreignColumns: [users.id],
        name: "documents_verified_by_fkey"
    }),
    foreignKey({
        columns: [table.updatedBy],
        foreignColumns: [users.id],
        name: "documents_updated_by_fkey"
    }),
    foreignKey({
        columns: [table.deletedBy],
        foreignColumns: [users.id],
        name: "documents_deleted_by_fkey"
    }),
]);
