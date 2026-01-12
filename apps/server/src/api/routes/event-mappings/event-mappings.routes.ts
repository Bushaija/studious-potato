// event-mappings/event-mappings.routes.ts
import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { IdParamsSchema } from "stoker/openapi/schemas";
import { 
  selectEventMappingSchema, 
  insertEventMappingSchema, 
  patchEventMappingSchema,
  eventMappingListQuerySchema,
  bulkUpdateMappingsSchema,
  validateMappingSchema,
  selectEventSchema
} from "./event-mappings.types";
import { notFoundSchema } from "@/api/lib/constants";

const tags = ["event-mappings"];

export const list = createRoute({
  path: "/event-mappings",
  method: "get",
  tags,
  request: {
    query: eventMappingListQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        data: z.array(selectEventMappingSchema.extend({
          event: selectEventSchema.optional(),
          activity: z.object({
            id: z.number(),
            name: z.string(),
            code: z.string().optional(),
          }).optional(),
          category: z.object({
            id: z.number(),
            name: z.string(),
            code: z.string(),
          }).optional(),
        })),
        pagination: z.object({
          page: z.number(),
          limit: z.number(),
          total: z.number(),
          totalPages: z.number(),
        }),
      }),
      "List of event mappings"
    ),
  },
});

export const getOne = createRoute({
  path: "/event-mappings/{id}",
  method: "get",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectEventMappingSchema.extend({
        event: selectEventSchema,
        activity: z.object({
          id: z.number(),
          name: z.string(),
          code: z.string().optional(),
          activityType: z.string(),
        }).optional(),
        category: z.object({
          id: z.number(),
          name: z.string(),
          code: z.string(),
          description: z.string().optional(),
        }).optional(),
      }),
      "Event mapping details"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Event mapping not found"
    ),
  },
});

export const create = createRoute({
  path: "/event-mappings",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(insertEventMappingSchema, "Event mapping to create"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectEventMappingSchema,
      "Created event mapping"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ message: z.string() }),
      "Validation error"
    ),
  },
});

export const update = createRoute({
  path: "/event-mappings/{id}",
  method: "put",
  tags,
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(patchEventMappingSchema, "Event mapping updates"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectEventMappingSchema,
      "Updated event mapping"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Event mapping not found"
    ),
  },
});

export const remove = createRoute({
  path: "/event-mappings/{id}",
  method: "delete",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Event mapping deleted successfully",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Event mapping not found"
    ),
  },
});

export const bulkUpdate = createRoute({
  path: "/event-mappings/bulk-update",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(bulkUpdateMappingsSchema, "Bulk mapping updates"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        created: z.number(),
        updated: z.number(),
        errors: z.array(z.object({
          index: z.number(),
          message: z.string(),
        })),
      }),
      "Bulk update results"
    ),
  },
});

export const validateMapping = createRoute({
  path: "/event-mappings/validate",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(validateMappingSchema, "Mapping to validate"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        isValid: z.boolean(),
        result: z.any().optional(),
        errors: z.array(z.object({
          message: z.string(),
          code: z.string(),
        })),
        warnings: z.array(z.object({
          message: z.string(),
          code: z.string(),
        })),
      }),
      "Mapping validation results"
    ),
  },
});

export const getTemplate = createRoute({
  path: "/event-mappings/templates/{projectType}/{facilityType}",
  method: "get",
  tags,
  request: {
    params: z.object({
      projectType: z.enum(['HIV', 'Malaria', 'TB']),
      facilityType: z.enum(['hospital', 'health_center']),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        mappings: z.array(selectEventMappingSchema),
        unmappedEvents: z.array(selectEventSchema),
        recommendedMappings: z.array(z.object({
          eventId: z.number(),
          suggestedActivityId: z.number().optional(),
          suggestedCategoryId: z.number().optional(),
          confidence: z.number(),
          reason: z.string(),
        })),
      }),
      "Event mapping template"
    ),
  },
});

export type ListRoute = typeof list;
export type GetOneRoute = typeof getOne;
export type CreateRoute = typeof create;
export type UpdateRoute = typeof update;
export type RemoveRoute = typeof remove;
export type BulkUpdateRoute = typeof bulkUpdate;
export type ValidateMappingRoute = typeof validateMapping;
export type GetTemplateRoute = typeof getTemplate;