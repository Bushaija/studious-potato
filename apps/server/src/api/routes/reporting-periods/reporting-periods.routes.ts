import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { IdParamsSchema } from "stoker/openapi/schemas";
import { 
  selectReportingPeriodSchema, 
  insertReportingPeriodSchema,
  patchReportingPeriodSchema,
  reportingPeriodsQuerySchema,
  reportingPeriodsListSchema,
  reportingPeriodStatsSchema
} from "./reporting-periods.types";
import { notFoundSchema } from "@/api/lib/constants";

const tags = ["reporting-periods"];

export const list = createRoute({
  path: "/reporting-periods",
  method: "get",
  tags,
  request: {
    query: reportingPeriodsQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      reportingPeriodsListSchema,
      "List of reporting periods with pagination"
    ),
  },
});

export const create = createRoute({
  path: "/reporting-periods",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(insertReportingPeriodSchema, "Reporting period data"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectReportingPeriodSchema,
      "The created reporting period"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        errors: z.array(z.object({
          path: z.array(z.string()),
          message: z.string(),
        })).optional(),
      }),
      "Validation error"
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      z.object({
        message: z.string(),
        conflictField: z.string(),
      }),
      "Reporting period already exists for the given year and period type"
    ),
  },
});

export const getOne = createRoute({
  path: "/reporting-periods/{id}",
  method: "get",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectReportingPeriodSchema,
      "The reporting period"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Reporting period not found"
    ),
  },
});

export const patch = createRoute({
  path: "/reporting-periods/{id}",
  method: "patch",
  tags,
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(patchReportingPeriodSchema, "Fields to update"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectReportingPeriodSchema,
      "The updated reporting period"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        errors: z.array(z.object({
          path: z.array(z.string()),
          message: z.string(),
        })).optional(),
      }),
      "Validation error"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Reporting period not found"
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      z.object({
        message: z.string(),
        conflictField: z.string(),
      }),
      "Update would create a conflict"
    ),
  },
});

export const remove = createRoute({
  path: "/reporting-periods/{id}",
  method: "delete",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Reporting period deleted successfully",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Reporting period not found"
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      z.object({
        message: z.string(),
        relatedEntities: z.array(z.string()),
      }),
      "Cannot delete reporting period due to existing dependencies"
    ),
  },
});

export const getCurrentPeriod = createRoute({
  path: "/reporting-periods/current",
  method: "get",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectReportingPeriodSchema,
      "Current active reporting period"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "No current active reporting period found"
    ),
  },
});

export const getStats = createRoute({
  path: "/reporting-periods/stats",
  method: "get",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      reportingPeriodStatsSchema,
      "Reporting periods statistics"
    ),
  },
});

export const getByYear = createRoute({
  path: "/reporting-periods/year/{year}",
  method: "get",
  tags,
  request: {
    params: z.object({
      year: z.string().transform((val) => parseInt(val)),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectReportingPeriodSchema),
      "Reporting periods for the specified year"
    ),
  },
});

// Route type exports
export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type GetCurrentPeriodRoute = typeof getCurrentPeriod;
export type GetStatsRoute = typeof getStats;
export type GetByYearRoute = typeof getByYear;