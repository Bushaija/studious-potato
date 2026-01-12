import { eq, and, desc, count } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { db } from "@/api/db";
import { formSchemas, moduleType, projectType, facilityType } from "@/api/db/schema";
import type { AppRouteHandler } from "@/api/lib/types";
import type { 
  ListRoute, 
  CreateRoute, 
  GetOneRoute, 
  UpdateRoute, 
  RemoveRoute,
  ActivateRoute,
  DeactivateRoute 
} from "./schemas.routes";

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const query = c.req.query();
  const page = parseInt(query.page || "1");
  const limit = parseInt(query.limit || "10");
  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [];
  if (query.moduleType) {
    conditions.push(eq(formSchemas.moduleType, query.moduleType as any));
  }
  if (query.projectType) {
    conditions.push(eq(formSchemas.projectType, query.projectType as any));
  }
  if (query.facilityType) {
    conditions.push(eq(formSchemas.facilityType, query.facilityType as any));
  }
  if (query.isActive) {
    conditions.push(eq(formSchemas.isActive, query.isActive === 'true'));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const [totalResult] = await db
    .select({ count: count() })
    .from(formSchemas)
    .where(whereClause);
  
  const total = totalResult.count;

  // Get paginated data
  const data = await db.query.formSchemas.findMany({
    where: whereClause,
    orderBy: [desc(formSchemas.createdAt)],
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
  const body =  await c.req.json();
  
  try {
    const [newSchema] = await db
      .insert(formSchemas)
      .values({
        ...body,
        // TODO: Get user ID from auth context
        createdBy: 1, // Temporary hardcoded value
      })
      .returning();

    return c.json(newSchema, HttpStatusCodes.CREATED);
  } catch (error) {
    return c.json(
      {
        error: "CREATION_FAILED",
        message: "Failed to create form schema",
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.param();
  const schemaId = parseInt(id);

  const schema = await db.query.formSchemas.findFirst({
    where: eq(formSchemas.id, schemaId),
  });

  if (!schema) {
    return c.json(
      {
        message: "Form schema not found",
      },
      HttpStatusCodes.NOT_FOUND
    );
  }

  return c.json(schema, HttpStatusCodes.OK);
};

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
  const { id } = c.req.param();
  const body = c.req.json();
  const schemaId = parseInt(id);

  try {
    const [updatedSchema] = await db
      .update(formSchemas)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(formSchemas.id, schemaId))
      .returning();

    if (!updatedSchema) {
      return c.json(
        {
          message: "Form schema not found",
        },
        HttpStatusCodes.NOT_FOUND
      );
    }

    return c.json(updatedSchema, HttpStatusCodes.OK);
  } catch (error) {
    return c.json(
      {
        error: "UPDATE_FAILED",
        message: "Failed to update form schema",
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.param();
  const schemaId = parseInt(id);

  const deleted = await db
    .delete(formSchemas)
    .where(eq(formSchemas.id, schemaId))
    .returning();

  if (deleted.length === 0) {
    return c.json(
      {
        message: "Form schema not found",
      },
      HttpStatusCodes.NOT_FOUND
    );
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const activate: AppRouteHandler<ActivateRoute> = async (c) => {
  const { id } = c.req.param();
  const schemaId = parseInt(id);

  const [updatedSchema] = await db
    .update(formSchemas)
    .set({
      isActive: true,
      updatedAt: new Date(),
    })
    .where(eq(formSchemas.id, schemaId))
    .returning();

  if (!updatedSchema) {
    return c.json(
      {
        message: "Form schema not found",
      },
      HttpStatusCodes.NOT_FOUND
    );
  }

  return c.json(updatedSchema, HttpStatusCodes.OK);
};

export const deactivate: AppRouteHandler<DeactivateRoute> = async (c) => {
  const { id } = c.req.param();
  const schemaId = parseInt(id);

  const [updatedSchema] = await db
    .update(formSchemas)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(formSchemas.id, schemaId))
    .returning();

  if (!updatedSchema) {
    return c.json(
      {
        message: "Form schema not found",
      },
      HttpStatusCodes.NOT_FOUND
    );
  }

  return c.json(updatedSchema, HttpStatusCodes.OK);
};