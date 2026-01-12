import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { IdParamsSchema } from "stoker/openapi/schemas";
import {
  exportRequestSchema,
  exportResponseSchema,
  bulkExportRequestSchema,
  bulkExportResponseSchema,
  migrationExportRequestSchema,
  exportTemplateSchema,
  exportTemplateListRequestSchema,
  exportTemplateListResponseSchema,
  exportJobStatusSchema,
} from "./bulk.types";
import { notFoundSchema } from "@/api/lib/constants";


const tags = ["bulk"];

export const exportSingleReport = createRoute({
  path: "/bulk/export/report/{id}",
  method: "post",
  tags,
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(exportRequestSchema, "Export parameters"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      exportResponseSchema,
      "Export initiated successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Report not found"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ message: z.string() }),
      "Invalid export parameters"
    ),
  },
});

export const bulkExport = createRoute({
  path: "/bulk/export",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(bulkExportRequestSchema, "Bulk export parameters"),
  },
  responses: {
    [HttpStatusCodes.ACCEPTED]: jsonContent(
      bulkExportResponseSchema,
      "Bulk export queued successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ message: z.string() }),
      "Invalid export parameters"
    ),
  },
});

export const getExportStatus = createRoute({
  path: "/bulk/export/{exportId}/status",
  method: "get",
  tags,
  request: {
    params: z.object({ exportId: z.string() }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      exportJobStatusSchema,
      "Export status retrieved successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Export job not found"
    ),
  },
});

export const downloadExport = createRoute({
  path: "/bulk/export/{exportId}/download",
  method: "get",
  tags,
  request: {
    params: z.object({ exportId: z.string() }),
    query: z.object({
      fileIndex: z.number().int().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "File download",
      content: {
        "application/octet-stream": {
          schema: { type: "string", format: "binary" },
        },
        "application/pdf": {
          schema: { type: "string", format: "binary" },
        },
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
          schema: { type: "string", format: "binary" },
        },
        "text/csv": {
          schema: { type: "string" },
        },
        "application/json": {
          schema: { type: "string" },
        },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Export file not found"
    ),
  },
});

export const cancelExport = createRoute({
  path: "/bulk/export/{exportId}/cancel",
  method: "post",
  tags,
  request: {
    params: z.object({ exportId: z.string() }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ message: z.string() }),
      "Export cancelled successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Export job not found"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ message: z.string() }),
      "Cannot cancel export in current state"
    ),
  },
});

export const migrationExport = createRoute({
  path: "/bulk/migration-export",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(migrationExportRequestSchema, "Migration export parameters"),
  },
  responses: {
    [HttpStatusCodes.ACCEPTED]: jsonContent(
      bulkExportResponseSchema,
      "Migration export queued successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ message: z.string() }),
      "Invalid migration parameters"
    ),
  },
});

export const listExportTemplates = createRoute({
  path: "/bulk/export-templates",
  method: "get",
  tags,
  request: {
    query: exportTemplateListRequestSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      exportTemplateListResponseSchema,
      "Export templates retrieved successfully"
    ),
  },
});

export const createExportTemplate = createRoute({
  path: "/bulk/export-templates",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(
      exportTemplateSchema.omit({ id: true, createdAt: true, updatedAt: true }), 
      "Export template"
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      exportTemplateSchema,
      "Export template created successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ message: z.string() }),
      "Invalid template data"
    ),
  },
});

export const getExportTemplate = createRoute({
  path: "/bulk/export-templates/{id}",
  method: "get",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      exportTemplateSchema,
      "Export template retrieved successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Export template not found"
    ),
  },
});

export const updateExportTemplate = createRoute({
  path: "/bulk/export-templates/{id}",
  method: "put",
  tags,
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(
      exportTemplateSchema.omit({ id: true, createdAt: true, updatedAt: true }).partial(), 
      "Export template updates"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      exportTemplateSchema,
      "Export template updated successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Export template not found"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ message: z.string() }),
      "Invalid template data"
    ),
  },
});

export const deleteExportTemplate = createRoute({
  path: "/bulk/export-templates/{id}",
  method: "delete",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Export template deleted successfully",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Export template not found"
    ),
  },
});

export type ExportSingleReportRoute = typeof exportSingleReport;
export type BulkExportRoute = typeof bulkExport;
export type GetExportStatusRoute = typeof getExportStatus;
export type DownloadExportRoute = typeof downloadExport;
export type CancelExportRoute = typeof cancelExport;
export type MigrationExportRoute = typeof migrationExport;
export type ListExportTemplatesRoute = typeof listExportTemplates;
export type CreateExportTemplateRoute = typeof createExportTemplate;
export type GetExportTemplateRoute = typeof getExportTemplate;
export type UpdateExportTemplateRoute = typeof updateExportTemplate;
export type DeleteExportTemplateRoute = typeof deleteExportTemplate;
