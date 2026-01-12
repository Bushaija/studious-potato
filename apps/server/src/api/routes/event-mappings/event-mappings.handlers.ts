import { eq, and } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { db } from "@/api/db";
import { configurableEventMappings, events } from "@/api/db/schema";
import type { AppRouteHandler } from "@/api/lib/types";

// TODO: Create both mapping and validation services
import { mappingService } from "@/api/lib/services/mapping.service";
// import { validationService } from "@/api/lib/services/validation.service";
import type { 
  ListRoute, 
  GetOneRoute, 
  CreateRoute, 
  UpdateRoute, 
  RemoveRoute,
  BulkUpdateRoute,
  ValidateMappingRoute,
  GetTemplateRoute,
} from "./event-mappings.routes";
import { eventMappingListQuerySchema } from "./event-mappings.types";



/**
 * id
 * event_id
 * activity_id
 * category_id
 */
export const list: AppRouteHandler<ListRoute> = async (c) => {
  const query = eventMappingListQuerySchema.parse({
    ...c.req.query(),
    page: c.req.query('page') ? Number(c.req.query('page')) : undefined,
    limit: c.req.query('limit') ? Number(c.req.query('limit')) : undefined,
    eventId: c.req.query('eventId') ? Number(c.req.query('eventId')) : undefined,
    activityId: c.req.query('activityId') ? Number(c.req.query('activityId')) : undefined,
    categoryId: c.req.query('categoryId') ? Number(c.req.query('categoryId')) : undefined,
    isActive: c.req.query('isActive') ? c.req.query('isActive') === 'true' : undefined,
  });

  const offset = (query.page - 1) * query.limit;

  let whereConditions: any[] = [];
  
  if (query.eventId) {
    whereConditions.push(eq(configurableEventMappings.eventId, query.eventId));
  }
  if (query.activityId) {
    whereConditions.push(eq(configurableEventMappings.activityId, query.activityId));
  }
  if (query.categoryId) {
    whereConditions.push(eq(configurableEventMappings.categoryId, query.categoryId));
  }
  if (query.projectType) {
    whereConditions.push(eq(configurableEventMappings.projectType, query.projectType));
  }
  if (query.facilityType) {
    whereConditions.push(eq(configurableEventMappings.facilityType, query.facilityType));
  }
  if (query.mappingType) {
    whereConditions.push(eq(configurableEventMappings.mappingType, query.mappingType));
  }
  if (query.isActive !== undefined) {
    whereConditions.push(eq(configurableEventMappings.isActive, query.isActive));
  }

  const [data, countResult] = await Promise.all([
    db.query.configurableEventMappings.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      limit: query.limit,
      offset,
      with: {
        event: true,
        activity: {
          columns: { id: true, name: true, code: true, activityType: true }
        },
        category: {
          columns: { id: true, name: true, code: true, description: true }
        }
      },
      orderBy: (mappings, { desc }) => [desc(mappings.updatedAt)],
    }),
    db.query.configurableEventMappings.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      columns: { id: true },
    }),
  ]);

  const total = countResult.length;
  const totalPages = Math.ceil(total / query.limit);

  return c.json({
    data,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    },
  });
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.param();
  const mappingId = parseInt(id);

  const data = await db.query.configurableEventMappings.findFirst({
    where: eq(configurableEventMappings.id, mappingId),
    with: {
      event: true,
      activity: true,
      category: true,
    },
  });

  if (!data) {
    return c.json(
      { message: "Event mapping not found" },
      HttpStatusCodes.NOT_FOUND
    );
  }

  return c.json(data);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const body = await c.req.json();
  
  try {
    // Validate that either activityId or categoryId is provided
    if (!body.activityId && !body.categoryId) {
      return c.json(
        { message: "Either activityId or categoryId must be provided" },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Validate mapping formula if provided
    if (body.mappingFormula) {
      const validationResult = await mappingService.validateMappingFormula(
        body.mappingFormula
      );
      
      if (!validationResult.isValid) {
        return c.json(
          { 
            message: "Invalid mapping formula",
            errors: validationResult.errors 
          },
          HttpStatusCodes.BAD_REQUEST
        );
      }
    }

    const [result] = await db.insert(configurableEventMappings).values({
      ...body,
      isActive: true,
    }).returning();

    const created = await db.query.configurableEventMappings.findFirst({
      where: eq(configurableEventMappings.id, result.id),
      with: {
        event: true,
        activity: true,
        category: true,
      },
    });

    return c.json(created, HttpStatusCodes.CREATED);
  } catch (error) {
    return c.json(
      { message: "Failed to create event mapping" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const mappingId = parseInt(id);

  const existing = await db.query.configurableEventMappings.findFirst({
    where: eq(configurableEventMappings.id, mappingId),
  });

  if (!existing) {
    return c.json(
      { message: "Event mapping not found" },
      HttpStatusCodes.NOT_FOUND
    );
  }

  try {
          // Validate mapping formula if being updated
    if (body.mappingFormula && body.mappingFormula !== existing.mappingFormula) {
      const validationResult = await mappingService.validateMappingFormula(
        body.mappingFormula
      );
      
      if (!validationResult.isValid) {
        return c.json(
          { 
            message: "Invalid mapping formula",
            errors: validationResult.errors 
          },
          HttpStatusCodes.BAD_REQUEST
        );
      }
    }

    await db.update(configurableEventMappings)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(configurableEventMappings.id, mappingId));

    const updated = await db.query.configurableEventMappings.findFirst({
      where: eq(configurableEventMappings.id, mappingId),
      with: {
        event: true,
        activity: true,
        category: true,
      },
    });

    return c.json(updated);
  } catch (error) {
    return c.json(
      { message: "Failed to update event mapping" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.param();
  const mappingId = parseInt(id);

  const existing = await db.query.configurableEventMappings.findFirst({
    where: eq(configurableEventMappings.id, mappingId),
  });

  if (!existing) {
    return c.json(
      { message: "Event mapping not found" },
      HttpStatusCodes.NOT_FOUND
    );
  }

  await db.delete(configurableEventMappings)
    .where(eq(configurableEventMappings.id, mappingId));

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const bulkUpdate: AppRouteHandler<BulkUpdateRoute> = async (c) => {
  const body = await c.req.json();
  
  try {
    let created = 0;
    let updated = 0;
    const errors: Array<{ index: number; message: string }> = [];

    for (let i = 0; i < body.mappings.length; i++) {
      const mapping = body.mappings[i];
      
      try {
        // Validate mapping formula if provided
        if (mapping.mappingFormula) {
          const validationResult = await mappingService.validateMappingFormula(
            mapping.mappingFormula
          );
          
          if (!validationResult.isValid) {
            errors.push({
              index: i,
              message: `Invalid mapping formula: ${validationResult.errors.join(', ')}`
            });
            continue;
          }
        }

        if (mapping.id) {
          // Update existing mapping
          await db.update(configurableEventMappings)
            .set({
              ...mapping,
              projectType: body.projectType,
              facilityType: body.facilityType,
              updatedAt: new Date(),
            })
            .where(eq(configurableEventMappings.id, mapping.id));
          updated++;
        } else {
          // Create new mapping
          await db.insert(configurableEventMappings).values({
            ...mapping,
            projectType: body.projectType,
            facilityType: body.facilityType,
            isActive: true,
          });
          created++;
        }
      } catch (error) {
        errors.push({
          index: i,
          message: `Failed to process mapping: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    return c.json({
      created,
      updated,
      errors,
    });
  } catch (error) {
    return c.json(
      { message: "Failed to perform bulk update" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const validateMapping: AppRouteHandler<ValidateMappingRoute> = async (c) => {
  const body = await c.req.json();
  
  try {
    const result = await mappingService.validateMappingFormula(
      body.mappingFormula,
      body.testData
    );

    return c.json({
      isValid: result.isValid,
      result: result.testResult,
      errors: result.errors,
      warnings: result.warnings || [],
    });
  } catch (error) {
    return c.json(
      { message: "Failed to validate mapping" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getTemplate: AppRouteHandler<GetTemplateRoute> = async (c) => {
  const { projectType, facilityType } = c.req.param();
  
  try {
    // Get existing mappings for this project/facility type
    const existingMappings = await db.query.configurableEventMappings.findMany({
      where: and(
        // TODO: add type check
        eq(configurableEventMappings.projectType, projectType as any),
        eq(configurableEventMappings.facilityType, facilityType as any),
        eq(configurableEventMappings.isActive, true)
      ),
      with: {
        event: true,
        activity: true,
        category: true,
      },
    });

    // Get all events
    const allEvents = await db.query.events.findMany({
      where: eq(events.isCurrent, true),
      orderBy: (events, { asc }) => [asc(events.displayOrder)],
    });

    // Find unmapped events
    const mappedEventIds = new Set(existingMappings.map(m => m.eventId));
    const unmappedEvents = allEvents.filter(event => !mappedEventIds.has(event.id));

    // Generate recommended mappings using ML/heuristics
    const recommendedMappings = await mappingService.generateRecommendedMappings(
      unmappedEvents,
      projectType,
      facilityType
    );

    return c.json({
      mappings: existingMappings,
      unmappedEvents,
      recommendedMappings,
    });
  } catch (error) {
    return c.json(
      { message: "Failed to get mapping template" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};