import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { IdParamsSchema } from "stoker/openapi/schemas";
import { 
  selectActivitySchema, 
  insertActivitySchema, 
  patchActivitySchema,
  bulkInsertActivitySchema,
  reorderActivitiesSchema
} from "./activities.types";
import { notFoundSchema } from "@/api/lib/constants";

const tags = ["activities"];

export const listQuerySchema = z.object({
  moduleType: z.enum(['planning', 'execution']).optional(),
  facilityType: z.enum(['hospital', 'health_center']).optional(),
  projectType: z.enum(['HIV', 'Malaria', 'TB']).optional(),
  isAnnualOnly: z.enum(['true', 'false']).optional(),
  isTotalRow: z.enum(['true', 'false']).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  categoryId: z.coerce.number().optional(),
  activityType: z.string().optional(),
  limit: z.string().optional(),
  page: z.string().optional(),
});

export const list = createRoute({
  path: "/activities",
  method: "get",
  tags,
  request: {
    query: listQuerySchema
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        data: z.array(selectActivitySchema),
        pagination: z.object({
          page: z.number(),
          limit: z.number(),
          total: z.number(),
          pages: z.number(),
        }),
      }),
      "List of activities with pagination"
    ),
  },
});

export const create = createRoute({
  path: "/activities",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(insertActivitySchema, "The activity to create"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectActivitySchema,
      "The created activity"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        error: z.string(),
        message: z.string(),
      }),
      "Invalid activity data"
    ),
  },
});

export const bulkCreate = createRoute({
  path: "/activities/bulk",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(bulkInsertActivitySchema, "Activities to create in bulk"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      z.object({
        created: z.array(selectActivitySchema),
        errors: z.array(z.object({
          index: z.number(),
          error: z.string(),
        })),
      }),
      "Bulk create results"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        error: z.string(),
        message: z.string(),
      }),
      "Invalid bulk data"
    ),
  },
});

export const getOne = createRoute({
  path: "/activities/{id}",
  method: "get",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectActivitySchema,
      "The activity"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Activity not found"
    ),
  },
});

export const update = createRoute({
  path: "/activities/{id}",
  method: "put", 
  tags,
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(insertActivitySchema, "The complete activity data to update"), // Changed from patchActivitySchema to insertActivitySchema
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectActivitySchema,
      "The updated activity"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Activity not found"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        error: z.string(),
        message: z.string(),
      }),
      "Invalid activity data"
    ),
  },
});
export const remove = createRoute({
  path: "/activities/{id}",
  method: "delete",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "The activity was deleted",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Activity not found"
    ),
  },
});

export const reorder = createRoute({
  path: "/activities/reorder",
  method: "patch",
  tags,
  request: {
    body: jsonContentRequired(reorderActivitiesSchema, "Activity order updates"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        updated: z.array(selectActivitySchema),
        message: z.string(),
      }),
      "Reordered activities"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        error: z.string(),
        message: z.string(),
      }),
      "Invalid reorder data"
    ),
  },
});

export const getByCategory = createRoute({
  path: "/activities/category/{categoryId}",
  method: "get",
  tags,
  request: {
    params: z.object({
      categoryId: z.string().regex(/^\d+$/).transform(Number),
    }),
    query: z.object({
      includeInactive: z.enum(['true', 'false']).default('false'),
      moduleType: z.enum(['planning', 'execution']).optional(),
      projectType: z.enum(['HIV', 'Malaria', 'TB']).optional(),
      facilityType: z.enum(['hospital', 'health_center']).optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectActivitySchema),
      "Activities for the category"
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type BulkCreateRoute = typeof bulkCreate;
export type GetOneRoute = typeof getOne;
export type UpdateRoute = typeof update;
export type RemoveRoute = typeof remove;
export type ReorderRoute = typeof reorder;
export type GetByCategoryRoute = typeof getByCategory;