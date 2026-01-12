import { eq, and, desc, count } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { db } from "@/api/db";
import { dynamicActivities } from "@/api/db/schema";
import type { AppRouteHandler } from "@/api/lib/types";
import type { 
  ListRoute, 
  CreateRoute, 
  BulkCreateRoute,
  GetOneRoute, 
  UpdateRoute, 
  RemoveRoute,
  ReorderRoute,
  GetByCategoryRoute,
} from "./activities.routes";
import { listQuerySchema } from "./activities.routes"


export const list: AppRouteHandler<ListRoute> = async (c) => {
  // const query = c.req.query();
  const query = listQuerySchema.parse(c.req.query())
  // const page = parseInt(query.page || "1");
  // const limit = parseInt(query.limit || "50");
  // const offset = (page - 1) * limit;
  const rawPage = Number(query.page) || 1;
  const rawLimit = Number(query.limit) || 50;

  const page = Math.max(1, rawPage); // ensure >= 1
  const limit = Math.min(100, Math.max(1, rawLimit)); // between 1 and 100
  const offset = (page - 1) * limit;

  const conditions = [];
  if (query.categoryId) {
    conditions.push(eq(dynamicActivities.categoryId, query.categoryId));
  }
  if (query.moduleType) {
    conditions.push(eq(dynamicActivities.moduleType, query.moduleType));
  }
  if (query.projectType) {
    // TODO: Add type checking
    conditions.push(eq(dynamicActivities.projectType, query.projectType));
  }
  if (query.facilityType) {
    // TODO: Add type checking
    conditions.push(eq(dynamicActivities.facilityType, query.facilityType));
  }
  if (query.activityType) {
    conditions.push(eq(dynamicActivities.activityType, query.activityType));
  }
  if (query.isTotalRow) {
    conditions.push(eq(dynamicActivities.isTotalRow, query.isTotalRow === 'true'));
  }
  if (query.isAnnualOnly) {
    conditions.push(eq(dynamicActivities.isAnnualOnly, query.isAnnualOnly === 'true'));
  }
  if (query.isActive) {
    conditions.push(eq(dynamicActivities.isActive, query.isActive === 'true'));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db
    .select({ count: count() })
    .from(dynamicActivities)
    .where(whereClause);
  
  const total = totalResult.count;

  const data = await db.query.dynamicActivities.findMany({
    where: whereClause,
    orderBy: [dynamicActivities.displayOrder, desc(dynamicActivities.createdAt)],
    limit,
    offset,
  });

  return c.json({
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const body = await c.req.json();
  
  try {
    const [newActivity] = await db
      .insert(dynamicActivities)
      .values(body)
      .returning();

    return c.json(newActivity, HttpStatusCodes.CREATED);
  } catch (error) {
    return c.json(
      {
        error: "CREATION_FAILED",
        message: "Failed to create activity",
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

export const bulkCreate: AppRouteHandler<BulkCreateRoute> = async (c) => {
  const { activities } = await c.req.json();
  
  const created = [];
  const errors = [];

  for (let i = 0; i < activities.length; i++) {
    try {
      const [newActivity] = await db
        .insert(dynamicActivities)
        .values(activities[i])
        .returning();
      created.push(newActivity);
    } catch (error) {
      errors.push({
        index: i,
        error: `Failed to create activity at index ${i}`,
      });
    }
  }

  return c.json({ created, errors }, HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.param();
  const activityId = parseInt(id)
  
  const activity = await db.query.dynamicActivities.findFirst({
    where: eq(dynamicActivities.id, activityId),
  });

  if (!activity) {
    return c.json(
      {
        message: "Activity not found",
      },
      HttpStatusCodes.NOT_FOUND
    );
  }

  return c.json(activity, HttpStatusCodes.OK);
};

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const activityId = parseInt(id);

  // Validate the complete activity data since we're using PUT
  if (isNaN(activityId)) {
    return c.json(
      {
        error: "INVALID_ID",
        message: "Invalid activity ID",
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }

  try {
    const [updatedActivity] = await db
      .update(dynamicActivities)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(dynamicActivities.id, activityId))
      .returning();

    if (!updatedActivity) {
      return c.json(
        {
          message: "Activity not found",
        },
        HttpStatusCodes.NOT_FOUND
      );
    }

    return c.json(updatedActivity, HttpStatusCodes.OK);
  } catch (error) {
    console.error('Update error:', error);
    return c.json(
      {
        error: "UPDATE_FAILED",
        message: "Failed to update activity",
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};


export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.param();
  const activityId = parseInt(id);

  // Use the exact same query pattern as getOne
  const activity = await db.query.dynamicActivities.findFirst({
    where: eq(dynamicActivities.id, activityId),
  });

  if (!activity) {
    return c.json(
      {
        message: "Activity not found",
      },
      HttpStatusCodes.NOT_FOUND
    );
  }

  try {
    // Attempt hard delete
    const deleted = await db
      .delete(dynamicActivities)
      .where(eq(dynamicActivities.id, activityId))
      .returning({ id: dynamicActivities.id });

    if (deleted.length === 0) {
      // Fallback to soft-delete if hard delete didn't affect any row
      const [softDeleted] = await db
        .update(dynamicActivities)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(dynamicActivities.id, activityId))
        .returning({ id: dynamicActivities.id });

      if (!softDeleted) {
        return c.json(
          { message: "Failed to delete activity" },
          HttpStatusCodes.INTERNAL_SERVER_ERROR
        );
      }
    }

    return c.body(null, HttpStatusCodes.NO_CONTENT);
  } catch (error) {
    console.error('Delete error:', error);
    return c.json(
      {
        error: "DELETE_FAILED",
        message: "Failed to delete activity",
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

export const reorder: AppRouteHandler<ReorderRoute> = async (c) => {
  const { activityOrders } = await c.req.json();
  
  try {
    const updated = [];

    for (const order of activityOrders) {
      const [updatedActivity] = await db
        .update(dynamicActivities)
        .set({
          displayOrder: order.displayOrder,
          updatedAt: new Date(),
        })
        .where(eq(dynamicActivities.id, order.id))
        .returning();

      if (updatedActivity) {
        updated.push(updatedActivity);
      }
    }

    return c.json({
      updated,
      message: `Successfully reordered ${updated.length} activities`,
    }, HttpStatusCodes.OK);
  } catch (error) {
    return c.json(
      {
        error: "REORDER_FAILED",
        message: "Failed to reorder activities",
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

export const getByCategory: AppRouteHandler<GetByCategoryRoute> = async (c) => {
  const { categoryId } = c.req.param();
  const query = c.req.query();

  const conditions = [eq(dynamicActivities.categoryId, parseInt(categoryId))];
  
  if (query.includeInactive === 'false') {
    conditions.push(eq(dynamicActivities.isActive, true));
  }
  
  if (query.moduleType) {
    conditions.push(eq(dynamicActivities.moduleType, query.moduleType as any));
  }
  
  if (query.projectType) {
    conditions.push(eq(dynamicActivities.projectType, query.projectType as any));
  }
  
  if (query.facilityType) {
    conditions.push(eq(dynamicActivities.facilityType, query.facilityType as any));
  }

  const data = await db.query.dynamicActivities.findMany({
    where: and(...conditions),
    orderBy: [dynamicActivities.displayOrder],
  });

  return c.json(data, HttpStatusCodes.OK);
};