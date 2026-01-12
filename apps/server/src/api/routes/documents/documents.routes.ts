import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { IdParamsSchema } from "stoker/openapi/schemas";
import {
  documentWithRelationsSchema,
  documentListResponseSchema,
  documentQuerySchema,
  patchDocumentSchema,
  verifyDocumentSchema,
  deleteDocumentSchema,
} from "./documents.types";
import { notFoundSchema } from "@/api/lib/constants";

const tags = ["documents"];

export const upload = createRoute({
  path: "/documents",
  method: "post",
  tags,
  summary: "Upload a document",
  description: "Upload a new document file with metadata. Supports PDF, Word, Excel, images, CSV, and text files up to 10MB. Documents must be linked to an execution entry.",
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            file: z.any().openapi({
              type: "string",
              format: "binary",
              description: "Document file to upload (max 10MB)",
            }),
            documentName: z.string().max(255).openapi({
              description: "Display name for the document",
            }),
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
            ]).openapi({
              description: "Type/category of the document",
            }),
            description: z.string().optional().openapi({
              description: "Optional description of the document",
            }),
            executionEntryId: z.string().openapi({
              description: "ID of the execution entry this document belongs to",
            }),
            metadata: z.string().optional().openapi({
              description: "Optional JSON string with additional metadata",
            }),
          }),
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      documentWithRelationsSchema,
      "Document uploaded successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ message: z.string(), error: z.string().optional() }),
      "Invalid request data or file validation failed"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      z.object({ message: z.string() }),
      "Execution entry not found"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Access denied to facility"
    ),
    [HttpStatusCodes.REQUEST_TOO_LONG]: jsonContent(
      z.object({ message: z.string() }),
      "File size exceeds 10MB limit"
    ),
  },
});

export const list = createRoute({
  path: "/documents",
  method: "get",
  tags,
  summary: "List documents with filtering",
  description: "Retrieve documents with optional filters for execution entry, facility, project, reporting period, document type, and verification status",
  request: {
    query: documentQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      documentListResponseSchema,
      "Documents retrieved successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      z.object({ message: z.string() }),
      "Execution entry not found"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Access denied to facility"
    ),
  },
});

export const getOne = createRoute({
  path: "/documents/{id}",
  method: "get",
  tags,
  summary: "Get a single document",
  description: "Retrieve a document by ID with all related entities",
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      documentWithRelationsSchema,
      "Document retrieved successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Document not found"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Access denied to this document"
    ),
  },
});

export const patch = createRoute({
  path: "/documents/{id}",
  method: "patch",
  tags,
  summary: "Update document metadata",
  description: "Update document metadata (name, description, verification notes, etc.). File content cannot be changed.",
  request: {
    params: IdParamsSchema,
    body: jsonContent(
      patchDocumentSchema,
      "Document update data"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      documentWithRelationsSchema,
      "Document updated successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Document not found"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Access denied to this document"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ message: z.string(), error: z.string().optional() }),
      "Invalid request data"
    ),
  },
});

export const verify = createRoute({
  path: "/documents/{id}/verify",
  method: "post",
  tags,
  summary: "Verify a document",
  description: "Mark a document as verified by the current user",
  request: {
    params: IdParamsSchema,
    body: jsonContent(
      verifyDocumentSchema,
      "Optional verification notes"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      documentWithRelationsSchema,
      "Document verified successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Document not found"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Access denied or insufficient permissions"
    ),
  },
});

export const unverify = createRoute({
  path: "/documents/{id}/unverify",
  method: "post",
  tags,
  summary: "Unverify a document",
  description: "Remove verification status from a document",
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      documentWithRelationsSchema,
      "Document unverified successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Document not found"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Access denied or insufficient permissions"
    ),
  },
});

export const softDelete = createRoute({
  path: "/documents/{id}",
  method: "delete",
  tags,
  summary: "Soft delete a document",
  description: "Mark a document as deleted without removing it from the database. Requires a deletion reason.",
  request: {
    params: IdParamsSchema,
    body: jsonContent(
      deleteDocumentSchema,
      "Deletion reason (required)"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        message: z.string(),
        document: documentWithRelationsSchema,
      }),
      "Document deleted successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Document not found"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Access denied to this document"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ message: z.string(), error: z.string().optional() }),
      "Invalid request or missing deletion reason"
    ),
  },
});

export const restore = createRoute({
  path: "/documents/{id}/restore",
  method: "post",
  tags,
  summary: "Restore a soft-deleted document",
  description: "Restore a previously soft-deleted document",
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      documentWithRelationsSchema,
      "Document restored successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Document not found"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Access denied to this document"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ message: z.string() }),
      "Document is not deleted"
    ),
  },
});

export const download = createRoute({
  path: "/documents/{id}/download",
  method: "get",
  tags,
  summary: "Download a document file",
  description: "Download the actual file content of a document",
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "File content",
      content: {
        "application/octet-stream": {
          schema: {
            type: "string",
            format: "binary",
          },
        },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Document or file not found"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Access denied to this document"
    ),
  },
});

export const getByExecutionEntry = createRoute({
  path: "/documents/execution-entry/{executionEntryId}",
  method: "get",
  tags,
  summary: "Get documents for an execution entry",
  description: "Retrieve all documents linked to a specific execution entry",
  request: {
    params: z.object({
      executionEntryId: z.coerce.number().int().positive(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        documents: z.array(documentWithRelationsSchema),
        executionEntry: z.object({
          id: z.number(),
          entityType: z.string(),
          facilityId: z.number(),
          projectId: z.number(),
          reportingPeriodId: z.number(),
        }).optional(),
      }),
      "Documents retrieved successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Execution entry not found"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Access denied to this execution entry"
    ),
  },
});

export type UploadRoute = typeof upload;
export type ListRoute = typeof list;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type VerifyRoute = typeof verify;
export type UnverifyRoute = typeof unverify;
export type SoftDeleteRoute = typeof softDelete;
export type RestoreRoute = typeof restore;
export type DownloadRoute = typeof download;
export type GetByExecutionEntryRoute = typeof getByExecutionEntry;
