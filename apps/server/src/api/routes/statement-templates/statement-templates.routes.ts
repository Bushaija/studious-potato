import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { IdParamsSchema } from "stoker/openapi/schemas";
import { 
  selectStatementTemplateSchema,
  insertStatementTemplateSchema,
  patchStatementTemplateSchema,
  statementTemplatesQuerySchema,
  templateValidationSchema,
  bulkCreateTemplatesSchema,
  bulkUpdateTemplatesSchema,
  reorderTemplatesSchema,
  statementCodesSchema,
} from "./statement-templates.types";
import { notFoundSchema } from "@/api/lib/constants";

const tags = ["statement-templates"];

export const list = createRoute({
  path: "/statement-templates",
  method: "get",
  tags,
  request: {
    query: statementTemplatesQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "List of statement templates with optional hierarchy",
      content: {
        'application/json': {
          schema: {
            oneOf: [
              {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/SelectStatementTemplate' }
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      total: { type: 'number' },
                      limit: { type: 'number' },
                      offset: { type: 'number' },
                      hasMore: { type: 'boolean' }
                    }
                  }
                }
              },
              {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/HierarchicalStatementTemplate' }
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      total: { type: 'number' },
                      limit: { type: 'number' },
                      offset: { type: 'number' },
                      hasMore: { type: 'boolean' }
                    }
                  }
                }
              }
            ]
          }
        }
      }
    },
  },
});

export const create = createRoute({
  path: "/statement-templates",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(insertStatementTemplateSchema, "Statement template data"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectStatementTemplateSchema,
      "The created statement template"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        validationErrors: z.array(z.object({
          field: z.string(),
          message: z.string(),
        })),
      }),
      "Validation errors"
    ),
  },
});

export const getOne = createRoute({
  path: "/statement-templates/{id}",
  method: "get",
  tags,
  request: {
    params: IdParamsSchema,
    query: z.object({
      includeChildren: z.string().optional().transform((val) => val === 'true'),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectStatementTemplateSchema, // Use base schema only
      "The statement template"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Statement template not found"
    ),
  },
});

export const update = createRoute({
  path: "/statement-templates/{id}",
  method: "put",
  tags,
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(insertStatementTemplateSchema, "Complete statement template data"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectStatementTemplateSchema,
      "The updated statement template"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Statement template not found"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        validationErrors: z.array(z.object({
          field: z.string(),
          message: z.string(),
        })),
      }),
      "Validation errors"
    ),
  },
});

export const patch = createRoute({
  path: "/statement-templates/{id}",
  method: "patch",
  tags,
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(patchStatementTemplateSchema, "Fields to update"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectStatementTemplateSchema,
      "The updated statement template"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Statement template not found"
    ),
  },
});

export const remove = createRoute({
  path: "/statement-templates/{id}",
  method: "delete",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Statement template deleted successfully",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Statement template not found"
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      z.object({
        message: z.string(),
        dependencies: z.array(z.string()),
      }),
      "Cannot delete template due to dependencies"
    ),
  },
});

export const getByStatementCode = createRoute({
  path: "/statement-templates/statement/{statementCode}",
  method: "get",
  tags,
  request: {
    params: z.object({
      statementCode: z.string()
        .regex(/^[A-Z_]+$/, "Statement code must contain only uppercase letters and underscores")
        .min(3)
        .max(50),
    }),
    query: z.object({
      includeHierarchy: z.string().optional().transform((val) => val === 'true'),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        statementCode: z.string(),
        statementName: z.string(),
        totalLines: z.number(),
        maxLevel: z.number(),
        hasCalculatedLines: z.boolean(),
        templates: z.array(selectStatementTemplateSchema), // Use base schema
      }),
      "Statement structure with templates"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Statement code not found"
    ),
  },
});

export const validateTemplate = createRoute({
  path: "/statement-templates/validate",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(insertStatementTemplateSchema, "Template to validate"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      templateValidationSchema,
      "Validation results"
    ),
  },
});

export const bulkCreate = createRoute({
  path: "/statement-templates/bulk",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(bulkCreateTemplatesSchema, "Bulk template creation data"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      z.object({
        created: z.array(selectStatementTemplateSchema),
        errors: z.array(z.object({
          index: z.number(),
          error: z.string(),
        })),
      }),
      "Bulk creation results"
    ),
    [HttpStatusCodes.OK]: jsonContent(
      templateValidationSchema,
      "Validation results (when validateOnly=true)"
    ),
  },
});

export const bulkUpdate = createRoute({
  path: "/statement-templates/bulk",
  method: "patch",
  tags,
  request: {
    body: jsonContentRequired(bulkUpdateTemplatesSchema, "Bulk update data"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        updated: z.array(selectStatementTemplateSchema),
        errors: z.array(z.object({
          id: z.number(),
          error: z.string(),
        })),
      }),
      "Bulk update results"
    ),
  },
});

export const reorder = createRoute({
  path: "/statement-templates/reorder",
  method: "patch",
  tags,
  request: {
    body: jsonContentRequired(reorderTemplatesSchema, "Reorder data"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        updated: z.array(selectStatementTemplateSchema),
        message: z.string(),
      }),
      "Reorder results"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        errors: z.array(z.string()),
      }),
      "Reorder validation errors"
    ),
  },
});

export const getStatementCodes = createRoute({
  path: "/statement-templates/codes",
  method: "get",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      statementCodesSchema,
      "Available statement codes"
    ),
  },
});

export const duplicateTemplate = createRoute({
  path: "/statement-templates/{id}/duplicate",
  method: "post",
  tags,
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(
      z.object({
        newStatementCode: z.string(),
        newStatementName: z.string(),
        includeChildren: z.boolean().default(true),
      }),
      "Duplication parameters"
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      z.object({
        original: selectStatementTemplateSchema,
        duplicated: z.array(selectStatementTemplateSchema),
      }),
      "Duplication results"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Template to duplicate not found"
    ),
  },
});

// Route type exports
export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type UpdateRoute = typeof update;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type GetByStatementCodeRoute = typeof getByStatementCode;
export type ValidateTemplateRoute = typeof validateTemplate;
export type BulkCreateRoute = typeof bulkCreate;
export type BulkUpdateRoute = typeof bulkUpdate;
export type ReorderRoute = typeof reorder;
export type GetStatementCodesRoute = typeof getStatementCodes;
export type DuplicateTemplateRoute = typeof duplicateTemplate;