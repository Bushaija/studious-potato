import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { IdParamsSchema } from "stoker/openapi/schemas";
import { 
  selectFormFieldSchema, 
  insertFormFieldSchema, 
  patchFormFieldSchema,
  bulkInsertFormFieldSchema,
  bulkUpdateFormFieldSchema,
  reorderFieldsSchema
} from "./form-fields.types";
import { notFoundSchema } from "@/api/lib/constants";

const tags = ["form-fields"];

export const list = createRoute({
  path: "/form-fields",
  method: "get",
  tags,
  request: {
    query: z.object({
      schemaId: z.string().optional(),
      categoryId: z.string().optional(),
      parentFieldId: z.string().optional(),
      fieldType: z.enum([
        'text', 'number', 'currency', 'percentage', 'date', 
        'select', 'multiselect', 'checkbox', 'textarea', 
        'calculated', 'readonly'
      ]).optional(),
      isVisible: z.enum(['true', 'false']).optional(),
      isEditable: z.enum(['true', 'false']).optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        data: z.array(selectFormFieldSchema),
        pagination: z.object({
          page: z.number(),
          limit: z.number(),
          total: z.number(),
          pages: z.number(),
        }),
      }),
      "List of form fields with pagination"
    ),
  },
});

export const create = createRoute({
  path: "/form-fields",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(insertFormFieldSchema, "The form field to create"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectFormFieldSchema,
      "The created form field"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        error: z.string(),
        message: z.string(),
      }),
      "Invalid field data"
    ),
  },
});

export const bulkCreate = createRoute({
  path: "/form-fields/bulk",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(bulkInsertFormFieldSchema, "Form fields to create in bulk"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      z.object({
        created: z.array(selectFormFieldSchema),
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
  path: "/form-fields/{id}",
  method: "get",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectFormFieldSchema,
      "The form field"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Form field not found"
    ),
  },
});

export const update = createRoute({
  path: "/form-fields/{id}",
  method: "patch",
  tags,
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(patchFormFieldSchema, "The field data to update"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectFormFieldSchema,
      "The updated form field"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Form field not found"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        error: z.string(),
        message: z.string(),
      }),
      "Invalid field data"
    ),
  },
});

export const bulkUpdate = createRoute({
  path: "/form-fields/bulk",
  method: "patch",
  tags,
  request: {
    body: jsonContentRequired(bulkUpdateFormFieldSchema, "Form fields to update in bulk"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        updated: z.array(selectFormFieldSchema),
        errors: z.array(z.object({
          id: z.number(),
          error: z.string(),
        })),
      }),
      "Bulk update results"
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

export const reorder = createRoute({
  path: "/form-fields/reorder",
  method: "patch",
  tags,
  request: {
    body: jsonContentRequired(reorderFieldsSchema, "Field order updates"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        updated: z.array(selectFormFieldSchema),
        message: z.string(),
      }),
      "Reordered form fields"
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

export const remove = createRoute({
  path: "/form-fields/{id}",
  method: "delete",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "The form field was deleted",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Form field not found"
    ),
  },
});

export const getBySchema = createRoute({
  path: "/form-fields/schema/{schemaId}",
  method: "get",
  tags,
  request: {
    params: z.object({
      schemaId: z.string().regex(/^\d+$/).transform(Number),
    }),
    query: z.object({
      includeHidden: z.enum(['true', 'false']).default('false'),
      categoryId: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectFormFieldSchema),
      "Form fields for the schema"
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type BulkCreateRoute = typeof bulkCreate;
export type GetOneRoute = typeof getOne;
export type UpdateRoute = typeof update;
export type BulkUpdateRoute = typeof bulkUpdate;
export type ReorderRoute = typeof reorder;
export type RemoveRoute = typeof remove;
export type GetBySchemaRoute = typeof getBySchema;