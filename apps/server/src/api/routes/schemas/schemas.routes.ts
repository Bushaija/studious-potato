import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { IdParamsSchema } from "stoker/openapi/schemas";
import { selectFormSchemaSchema, insertFormSchemaSchema, patchFormSchemaSchema } from "./schemas.types";
import { notFoundSchema } from "@/api/lib/constants";

const tags = ["schemas"];

export const list = createRoute({
  path: "/schemas",
  method: "get",
  tags,
  request: {
    query: z.object({
      moduleType: z.enum(['planning', 'execution', 'reporting']).optional(),
      projectType: z.enum(['HIV', 'Malaria', 'TB']).optional(),
      facilityType: z.enum(['hospital', 'health_center']).optional(),
      isActive: z.enum(['true', 'false']).optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        data: z.array(selectFormSchemaSchema),
        pagination: z.object({
          page: z.number(),
          limit: z.number(),
          total: z.number(),
          pages: z.number(),
        }),
      }),
      "List of form schemas with pagination"
    ),
  },
});

export const create = createRoute({
  path: "/schemas",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(insertFormSchemaSchema, "The form schema to create"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectFormSchemaSchema,
      "The created form schema"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        error: z.string(),
        message: z.string(),
      }),
      "Invalid schema data"
    ),
  },
});

export const getOne = createRoute({
  path: "/schemas/{id}",
  method: "get",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectFormSchemaSchema,
      "The form schema"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Schema not found"
    ),
  },
});

export const update = createRoute({
  path: "/schemas/{id}",
  method: "patch",
  tags,
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(patchFormSchemaSchema, "The schema data to update"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectFormSchemaSchema,
      "The updated form schema"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Schema not found"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        error: z.string(),
        message: z.string(),
      }),
      "Invalid schema data"
    ),
  },
});

export const remove = createRoute({
  path: "/schemas/{id}",
  method: "delete",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "The schema was deleted",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Schema not found"
    ),
  },
});

export const activate = createRoute({
  path: "/schemas/{id}/activate",
  method: "patch",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectFormSchemaSchema,
      "The activated schema"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Schema not found"
    ),
  },
});

export const deactivate = createRoute({
  path: "/schemas/{id}/deactivate",
  method: "patch",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectFormSchemaSchema,
      "The deactivated schema"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Schema not found"
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type UpdateRoute = typeof update;
export type RemoveRoute = typeof remove;
export type ActivateRoute = typeof activate;
export type DeactivateRoute = typeof deactivate;