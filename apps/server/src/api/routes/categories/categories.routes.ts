import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { IdParamsSchema } from "stoker/openapi/schemas";
import { selectCategorySchema, insertCategorySchema, patchCategorySchema, categoryListQuerySchema } from "./categories.types";
import { notFoundSchema } from "@/api/lib/constants";

const tags = ["categories"];


export const create = createRoute({
  path: "/categories",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(insertCategorySchema, "The category to create"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectCategorySchema,
      "The created category"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        error: z.string(),
        message: z.string(),
      }),
      "Invalid category data"
    ),
  },
});

export const getOne = createRoute({
  path: "/categories/{id}",
  method: "get",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectCategorySchema,
      "The category"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Category not found"
    ),
  },
});

export const update = createRoute({
  path: "/categories/{id}",
  method: "patch",
  tags,
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(patchCategorySchema, "The category data to update"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectCategorySchema,
      "The updated category"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Category not found"
    ),
  },
});

export const remove = createRoute({
  path: "/categories/{id}",
  method: "delete",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "The category was deleted",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Category not found"
    ),
  },
});

export const getHierarchy = createRoute({
  path: "/categories/hierarchy",
  method: "get",
  tags,
  request: {
    query: z.object({
      projectType: z.enum(['HIV', 'Malaria', 'TB']).optional(),
      facilityType: z.enum(['hospital', 'health_center']).optional(),
      rootOnly: z.enum(['true', 'false']).default('false'),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(z.object({
        id: z.number().int(),
        code: z.string(),
        name: z.string(),
        displayOrder: z.number().int(),
        children: z.array(z.any()).optional(),
      })),
      "Hierarchical category structure"
    ),
  },
});

export const list = createRoute({
  path: "/categories",
  method: "get",
  tags,
  request: {
    query: categoryListQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        data: z.array(selectCategorySchema),
        pagination: z.object({
          page: z.number(),
          limit: z.number(),
          total: z.number(),
          pages: z.number(),
        }),
      }),
      "List of categories with pagination"
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type UpdateRoute = typeof update;
export type RemoveRoute = typeof remove;
export type GetHierarchyRoute = typeof getHierarchy;