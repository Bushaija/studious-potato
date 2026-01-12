import { z } from "@hono/zod-openapi";
import { createSelectSchema, createInsertSchema } from "drizzle-zod";
import { documents } from "@/db/schema";

// Base schemas from Drizzle
export const selectDocumentSchema = createSelectSchema(documents);
export const insertDocumentSchema = createInsertSchema(documents, {
  documentCode: z.string().max(50),
  documentName: z.string().max(255),
  fileName: z.string().max(255),
  fileSize: z.number().int().positive(),
  mimeType: z.string().max(100),
  fileUrl: z.string(),
  executionEntryId: z.number().int().positive(),
  uploadedBy: z.number().int().positive(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  verificationNotes: z.string().optional(),
});

export const patchDocumentSchema = insertDocumentSchema.partial();

// Query schema for filtering documents
export const documentQuerySchema = z.object({
  executionEntryId: z.coerce.number().int().positive().optional(),
  facilityId: z.coerce.number().int().positive().optional(),
  projectId: z.coerce.number().int().positive().optional(),
  reportingPeriodId: z.coerce.number().int().positive().optional(),
  documentType: z.enum([
    'cash_book',
    'bank_statement',
    'vat_report',
    'invoice',
    'receipt',
    'purchase_order',
    'payment_voucher',
    'journal_entry',
    'ledger',
    'trial_balance',
    'supporting_document',
    'other'
  ]).optional(),
  isVerified: z.coerce.boolean().optional(),
  uploadedBy: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(20),
});

// Document with relations schema
export const documentWithRelationsSchema = selectDocumentSchema.extend({
  executionEntry: z.object({
    id: z.number(),
    entityType: z.string(),
    facilityId: z.number(),
    projectId: z.number(),
    reportingPeriodId: z.number(),
  }).optional(),
  uploader: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }).optional(),
  verifier: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }).optional(),
});

// Document list response schema
export const documentListResponseSchema = z.object({
  documents: z.array(documentWithRelationsSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
  summary: z.object({
    totalDocuments: z.number(),
    byType: z.record(z.string(), z.number()),
    byExecutionEntry: z.record(z.string(), z.number()),
    verifiedCount: z.number(),
    unverifiedCount: z.number(),
  }),
});

// Soft delete request schema
export const deleteDocumentSchema = z.object({
  deletionReason: z.string().min(1, "Deletion reason is required"),
});

// Verification request schema
export const verifyDocumentSchema = z.object({
  verificationNotes: z.string().optional(),
});
