import { eq, and, isNull, count, desc, asc, sql, inArray } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { db } from "@/api/db";
import { statementTemplates } from "@/api/db/schema";
import type { AppRouteHandler } from "@/api/lib/types";
import type { 
  ListRoute, 
  CreateRoute, 
  GetOneRoute, 
  UpdateRoute,
  PatchRoute, 
  RemoveRoute,
  GetByStatementCodeRoute,
  ValidateTemplateRoute,
  BulkCreateRoute,
  BulkUpdateRoute,
  ReorderRoute,
  GetStatementCodesRoute,
  DuplicateTemplateRoute
} from "./statement-templates.routes";
import type { 
  SelectStatementTemplate,
  HierarchicalStatementTemplate,
  TemplateValidation
} from "./statement-templates.types";

// Helper function to format template data
const formatTemplate = (template: any): SelectStatementTemplate => ({
  ...template,
  createdAt: template.createdAt?.toISOString() || new Date().toISOString(),
  updatedAt: template.updatedAt?.toISOString() || new Date().toISOString(),
});

// Helper function to build hierarchical structure
const buildHierarchy = (templates: any[]): HierarchicalStatementTemplate[] => {
  const templateMap = new Map();
  const rootTemplates: HierarchicalStatementTemplate[] = [];

  // First pass: create map and format templates
  templates.forEach(template => {
    const formatted = {
      ...formatTemplate(template),
      children: [],
    };
    templateMap.set(template.id, formatted);
  });

  // Second pass: build hierarchy
  templates.forEach(template => {
    const formatted = templateMap.get(template.id);
    if (template.parentLineId) {
      const parent = templateMap.get(template.parentLineId);
      if (parent) {
        parent.children.push(formatted);
      } else {
        rootTemplates.push(formatted);
      }
    } else {
      rootTemplates.push(formatted);
    }
  });

  // Sort children by displayOrder
  const sortChildren = (items: HierarchicalStatementTemplate[]) => {
    items.sort((a, b) => a.displayOrder - b.displayOrder);
    items.forEach(item => {
      if (item.children?.length) {
        sortChildren(item.children);
      }
    });
  };

  sortChildren(rootTemplates);
  return rootTemplates;
};

// Helper function to validate template
const validateTemplate_ = (template: any, existingTemplates: any[] = []): TemplateValidation => {
  const errors = [];
  const warnings = [];

  // Check for duplicate line codes within the same statement
  if (template.lineCode) {
    const duplicate = existingTemplates.find(t => 
      t.lineCode === template.lineCode && 
      t.statementCode === template.statementCode &&
      t.id !== template.id
    );
    if (duplicate) {
      errors.push({
        field: "lineCode",
        message: "Line code already exists for this statement",
      });
    }
  }

  // Validate parent-child relationship
  if (template.parentLineId) {
    const parent = existingTemplates.find(t => t.id === template.parentLineId);
    if (!parent) {
      errors.push({
        field: "parentLineId",
        message: "Parent line does not exist",
      });
    } else if (parent.level >= template.level) {
      warnings.push({
        field: "level",
        message: "Child level should be greater than parent level",
      });
    }
  }

  // Validate calculation formula if it's a total line
  if (template.isTotalLine && !template.calculationFormula) {
    warnings.push({
      field: "calculationFormula",
      message: "Total lines should have a calculation formula",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const rawQuery = c.req.query();
  const query = {
    statementCode: rawQuery.statementCode,
    isActive: rawQuery.isActive === 'true' ? true : rawQuery.isActive === 'false' ? false : undefined,
    level: rawQuery.level ? parseInt(rawQuery.level) : undefined,
    parentLineId: rawQuery.parentLineId ? parseInt(rawQuery.parentLineId) : undefined,
    includeHierarchy: rawQuery.includeHierarchy === 'true',
    limit: rawQuery.limit ? parseInt(rawQuery.limit) : 100,
    offset: rawQuery.offset ? parseInt(rawQuery.offset) : 0,
  };
  const { 
    statementCode, 
    isActive, 
    level, 
    parentLineId, 
    includeHierarchy = false, 
  } = query;

  const limitNum = Number(query.limit ?? 100)
  const offsetNum = Number(query.offset ?? 0)

  // Build where conditions
  const conditions = [];
  if (statementCode) conditions.push(eq(statementTemplates.statementCode, statementCode));
  if (isActive !== undefined) conditions.push(eq(statementTemplates.isActive, Boolean(isActive)));
  if (level) conditions.push(eq(statementTemplates.level, parseInt(level.toString())));
  if (parentLineId !== undefined) {
    conditions.push(parentLineId === null ? isNull(statementTemplates.parentLineId) : eq(statementTemplates.parentLineId, parseInt(parentLineId.toString())));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const [totalResult] = await db
    .select({ count: count() })
    .from(statementTemplates)
    .where(whereClause);

  // Get data
  const templates = await db.query.statementTemplates.findMany({
    where: whereClause,
    limit: limitNum,
    offset: offsetNum,
    orderBy: [
      asc(statementTemplates.statementCode),
      asc(statementTemplates.displayOrder)
    ],
  });

  const total = totalResult.count;
  let responseData;

  if (includeHierarchy && statementCode) {
    // Build hierarchical structure for single statement
    responseData = buildHierarchy(templates);
  } else {
    // Return flat list
    responseData = templates.map(formatTemplate);
  }

  return c.json({
    data: responseData,
    pagination: {
      total,
      limit: limitNum,
      offset: offsetNum,
      hasMore: offsetNum + limitNum < total,
    },
  });
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const body = await c.req.json();

  try {
    // Get existing templates for validation
    const existingTemplates = await db.query.statementTemplates.findMany({
      where: eq(statementTemplates.statementCode, body.statementCode),
    });

    // Validate template
    const validation = validateTemplate_(body, existingTemplates);
    if (!validation.isValid) {
      return c.json(
        {
          message: "Template validation failed",
          validationErrors: validation.errors,
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    const [newTemplate] = await db
      .insert(statementTemplates)
      .values(body)
      .returning();

    return c.json(formatTemplate(newTemplate), HttpStatusCodes.CREATED);
  } catch (error) {
    console.error("Error creating statement template:", error);
    return c.json(
      { message: "Failed to create statement template" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.param();
  const { includeChildren = false } = c.req.query();
  const templateId = parseInt(id);

  const template = await db.query.statementTemplates.findFirst({
    where: eq(statementTemplates.id, templateId),
  });

  if (!template) {
    return c.json(
      { message: "Statement template not found" },
      HttpStatusCodes.NOT_FOUND
    );
  }

  if (includeChildren) {
    // Get all templates for the same statement to build hierarchy
    const allTemplates = await db.query.statementTemplates.findMany({
      where: eq(statementTemplates.statementCode, template.statementCode),
      orderBy: [asc(statementTemplates.displayOrder)],
    });

    const hierarchy = buildHierarchy(allTemplates);
    const findInHierarchy = (items: HierarchicalStatementTemplate[], targetId: number): HierarchicalStatementTemplate | null => {
      for (const item of items) {
        if (item.id === targetId) return item;
        if (item.children) {
          const found = findInHierarchy(item.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    const hierarchicalTemplate = findInHierarchy(hierarchy, templateId);
    return c.json(hierarchicalTemplate || formatTemplate(template));
  }

  return c.json(formatTemplate(template));
};

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const templateId = parseInt(id);

  try {
    // Check if template exists
    const existing = await db.query.statementTemplates.findFirst({
      where: eq(statementTemplates.id, templateId),
    });

    if (!existing) {
      return c.json(
        { message: "Statement template not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    // Get existing templates for validation
    const existingTemplates = await db.query.statementTemplates.findMany({
      where: eq(statementTemplates.statementCode, body.statementCode),
    });

    // Validate template
    const validation = validateTemplate_({ ...body, id: templateId }, existingTemplates);
    if (!validation.isValid) {
      return c.json(
        {
          message: "Template validation failed",
          validationErrors: validation.errors,
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    const [updatedTemplate] = await db
      .update(statementTemplates)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(statementTemplates.id, templateId))
      .returning();

    return c.json(formatTemplate(updatedTemplate));
  } catch (error) {
    console.error("Error updating statement template:", error);
    return c.json(
      { message: "Failed to update statement template" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const templateId = parseInt(id);

  try {
    // Check if template exists
    const existing = await db.query.statementTemplates.findFirst({
      where: eq(statementTemplates.id, templateId),
    });

    if (!existing) {
      return c.json(
        { message: "Statement template not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    const [updatedTemplate] = await db
      .update(statementTemplates)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(statementTemplates.id, templateId))
      .returning();

    return c.json(formatTemplate(updatedTemplate));
  } catch (error) {
    console.error("Error updating statement template:", error);
    return c.json(
      { message: "Failed to update statement template" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.param();
  const templateId = parseInt(id);

  try {
    // Check if template exists
    const existing = await db.query.statementTemplates.findFirst({
      where: eq(statementTemplates.id, templateId),
    });

    if (!existing) {
      return c.json(
        { message: "Statement template not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    // Check for child dependencies
    const children = await db.query.statementTemplates.findMany({
      where: eq(statementTemplates.parentLineId, templateId),
    });

    if (children.length > 0) {
      return c.json(
        {
          message: "Cannot delete template with child items",
          dependencies: children.map(child => `${child.lineItem} (ID: ${child.id})`),
        },
        HttpStatusCodes.CONFLICT
      );
    }

    await db.delete(statementTemplates).where(eq(statementTemplates.id, templateId));

    return c.body(null, HttpStatusCodes.NO_CONTENT);
  } catch (error) {
    console.error("Error deleting statement template:", error);
    return c.json(
      { message: "Failed to delete statement template" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getByStatementCode: AppRouteHandler<GetByStatementCodeRoute> = async (c) => {
  const { statementCode } = c.req.param();
  const { includeHierarchy = false } = c.req.query();

  const templates = await db.query.statementTemplates.findMany({
    where: eq(statementTemplates.statementCode, statementCode),
    orderBy: [asc(statementTemplates.displayOrder)],
  });

  if (templates.length === 0) {
    return c.json(
      { message: "Statement code not found" },
      HttpStatusCodes.NOT_FOUND
    );
  }

  const statementName = templates[0]?.statementName || statementCode;
  const maxLevel = Math.max(...templates.map(t => t.level ?? 0));
  const hasCalculatedLines = templates.some(t => t.calculationFormula);

  let templateData;
  if (includeHierarchy) {
    templateData = buildHierarchy(templates);
  } else {
    templateData = templates.map(formatTemplate);
  }

  return c.json({
    statementCode,
    statementName,
    totalLines: templates.length,
    maxLevel,
    hasCalculatedLines,
    templates: templateData,
  });
};

export const validateTemplate: AppRouteHandler<ValidateTemplateRoute> = async (c) => {
  const body = await c.req.json();

  try {
    // Get existing templates for validation
    const existingTemplates = await db.query.statementTemplates.findMany({
      where: eq(statementTemplates.statementCode, body.statementCode),
    });

    const validation = validateTemplate_(body, existingTemplates);
    return c.json(validation);
  } catch (error) {
    console.error("Error validating template:", error);
    return c.json(
      { message: "Failed to validate template" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const bulkCreate: AppRouteHandler<BulkCreateRoute> = async (c) => {
  const { templates, validateOnly = false } = await c.req.json();

  try {
    // Group templates by statement code for validation
    const templatesByStatement = templates.reduce((acc: Record<string, any[]>, template: any) => {
      if (!acc[template.statementCode]) {
        acc[template.statementCode] = [];
      }
      acc[template.statementCode].push(template);
      return acc;
    }, {} as Record<string, any[]>);

    // Validate all templates
    const allErrors = [];
    let isValid = true;

    for (const [statementCode, templates] of Object.entries(templatesByStatement)) {
      const existingTemplates = await db.query.statementTemplates.findMany({
        where: eq(statementTemplates.statementCode, statementCode),
      });

      for (let i = 0; i < templates.length; i++) {
        const template = templates[i];
        const validation = validateTemplate_(template, [...existingTemplates, ...templates.slice(0, i)]);
        
        if (!validation.isValid) {
          isValid = false;
          allErrors.push(...validation.errors.map(error => ({
            index: templates.indexOf(template),
            error: `${error.field}: ${error.message}`,
          })));
        }
      }
    }

    if (validateOnly) {
      return c.json({
        isValid,
        errors: allErrors,
        warnings: [],
      });
    }

    if (!isValid) {
      return c.json({
        created: [],
        errors: allErrors,
      }, HttpStatusCodes.CREATED);
    }

    // Create all templates
    const created = [];
    const errors = [];

    for (let i = 0; i < templates.length; i++) {
      try {
        const [newTemplate] = await db
          .insert(statementTemplates)
          .values(templates[i])
          .returning();
        created.push(formatTemplate(newTemplate));
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return c.json({ created, errors }, HttpStatusCodes.CREATED);
  } catch (error) {
    console.error("Error in bulk create:", error);
    return c.json(
      { message: "Failed to create templates" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const bulkUpdate: AppRouteHandler<BulkUpdateRoute> = async (c) => {
  const { updates } = await c.req.json();

  try {
    const updated = [];
    const errors = [];

    for (const update of updates) {
      try {
        // Check if template exists
        const existing = await db.query.statementTemplates.findFirst({
          where: eq(statementTemplates.id, update.id),
        });

        if (!existing) {
          errors.push({
            id: update.id,
            error: "Template not found",
          });
          continue;
        }

        const [updatedTemplate] = await db
          .update(statementTemplates)
          .set({ ...update.data, updatedAt: new Date() })
          .where(eq(statementTemplates.id, update.id))
          .returning();

        updated.push(formatTemplate(updatedTemplate));
      } catch (error) {
        errors.push({
          id: update.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return c.json({ updated, errors });
  } catch (error) {
    console.error("Error in bulk update:", error);
    return c.json(
      { message: "Failed to update templates" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const reorder: AppRouteHandler<ReorderRoute> = async (c) => {
  const { statementCode, reorderedItems } = await c.req.json();

  try {
    // Validate that all items belong to the statement
    const existingTemplates = await db.query.statementTemplates.findMany({
      where: eq(statementTemplates.statementCode, statementCode),
    });

    const existingIds = new Set(existingTemplates.map(t => t.id));
    const reorderIds = new Set(reorderedItems.map((item: any) => item.id));

    const errors = [];
    
    // Check for non-existent IDs
    for (const item of reorderedItems) {
      if (!existingIds.has(item.id)) {
        errors.push(`Template ID ${item.id} not found in statement ${statementCode}`);
      }
    }

    if (errors.length > 0) {
      return c.json(
        {
          message: "Reorder validation failed",
          errors,
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Update all items
    const updated = [];
    for (const item of reorderedItems) {
      const updateData = {
        displayOrder: item.displayOrder,
        ...(item.level !== undefined && { level: item.level }),
        ...(item.parentLineId !== undefined && { parentLineId: item.parentLineId }),
        updatedAt: new Date(),
      };

      const [updatedTemplate] = await db
        .update(statementTemplates)
        .set(updateData)
        .where(eq(statementTemplates.id, item.id))
        .returning();

      updated.push(formatTemplate(updatedTemplate));
    }

    return c.json({
      updated,
      message: `Successfully reordered ${updated.length} templates`,
    });
  } catch (error) {
    console.error("Error reordering templates:", error);
    return c.json(
      { message: "Failed to reorder templates" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getStatementCodes: AppRouteHandler<GetStatementCodesRoute> = async (c) => {
  try {
    // Get distinct statement codes with their names
    const statementCodes = await db
      .selectDistinct({
        code: statementTemplates.statementCode,
        name: statementTemplates.statementName,
      })
      .from(statementTemplates)
      .where(eq(statementTemplates.isActive, true))
      .orderBy(asc(statementTemplates.statementCode));

    const codes = statementCodes.map(sc => ({
      code: sc.code,
      name: sc.name,
      description: `Financial statement template for ${sc.name}`,
    }));

    return c.json({ codes });
  } catch (error) {
    console.error("Error getting statement codes:", error);
    return c.json(
      { message: "Failed to get statement codes" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const duplicateTemplate: AppRouteHandler<DuplicateTemplateRoute> = async (c) => {
  const { id } = c.req.param();
  const { newStatementCode, newStatementName, includeChildren = true } = await c.req.json();
  const templateId = parseInt(id);

  try {
    // Get the original template
    const originalTemplate = await db.query.statementTemplates.findFirst({
      where: eq(statementTemplates.id, templateId),
    });

    if (!originalTemplate) {
      return c.json(
        { message: "Template to duplicate not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    let templatesToDuplicate = [originalTemplate];

    if (includeChildren) {
      // Get all children recursively
      const getAllChildren = async (parentId: number): Promise<any[]> => {
        const children = await db.query.statementTemplates.findMany({
          where: eq(statementTemplates.parentLineId, parentId),
        });

        let allChildren = [...children];
        for (const child of children) {
          const grandChildren = await getAllChildren(child.id);
          allChildren = [...allChildren, ...grandChildren];
        }
        return allChildren;
      };

      const children = await getAllChildren(templateId);
      templatesToDuplicate = [originalTemplate, ...children];
    }

    // Create mapping of old IDs to new IDs
    const idMapping = new Map<number, number>();
    const duplicatedTemplates = [];

    // Sort templates by level to ensure parents are created before children
    templatesToDuplicate.sort((a, b) => (a.level || 0) - (b.level || 0));

    for (const template of templatesToDuplicate) {
      const newTemplate = {
        ...template,
        id: undefined, // Remove ID to create new
        statementCode: newStatementCode,
        statementName: newStatementName,
        parentLineId: template.parentLineId ? idMapping.get(template.parentLineId) || null : null,
        createdAt: undefined,
        updatedAt: undefined,
      };

      const [created] = await db
        .insert(statementTemplates)
        .values(newTemplate)
        .returning();

      idMapping.set(template.id, created.id);
      duplicatedTemplates.push(formatTemplate(created));
    }

    return c.json({
      original: formatTemplate(originalTemplate),
      duplicated: duplicatedTemplates,
    }, HttpStatusCodes.CREATED);
  } catch (error) {
    console.error("Error duplicating template:", error);
    return c.json(
      { message: "Failed to duplicate template" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};