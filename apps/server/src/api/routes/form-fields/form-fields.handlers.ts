import { eq, and, desc, count, inArray } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { db } from "@/api/db";
import { formFields } from "@/api/db/schema";
import type { AppRouteHandler } from "@/api/lib/types";
import type { 
  ListRoute, 
  CreateRoute, 
  BulkCreateRoute,
  GetOneRoute, 
  UpdateRoute, 
  BulkUpdateRoute,
  ReorderRoute,
  RemoveRoute,
  GetBySchemaRoute
} from "./form-fields.routes";

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const query = c.req.query();
  const page = parseInt(query.page || "1");
  const limit = parseInt(query.limit || "50");
  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [];
  if (query.schemaId) {
    conditions.push(eq(formFields.schemaId, parseInt(query.schemaId)));
  }
  if (query.categoryId) {
    conditions.push(eq(formFields.categoryId, parseInt(query.categoryId)));
  }
  if (query.parentFieldId) {
    conditions.push(eq(formFields.parentFieldId, parseInt(query.parentFieldId)));
  }
  if (query.fieldType) {
    // TODO: Add type checking
    conditions.push(eq(formFields.fieldType, query.fieldType as any));
  }
  if (query.isVisible) {
    conditions.push(eq(formFields.isVisible, query.isVisible === 'true'));
  }
  if (query.isEditable) {
    conditions.push(eq(formFields.isEditable, query.isEditable === 'true'));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const [totalResult] = await db
    .select({ count: count() })
    .from(formFields)
    .where(whereClause);
  
  const total = totalResult.count;

  // Get paginated data
  const data = await db.query.formFields.findMany({
    where: whereClause,
    orderBy: [formFields.displayOrder, desc(formFields.createdAt)],
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
    const [newField] = await db
      .insert(formFields)
      .values(body)
      .returning();

    return c.json(newField, HttpStatusCodes.CREATED);
  } catch (error) {
    return c.json(
      {
        error: "CREATION_FAILED",
        message: "Failed to create form field",
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

export const bulkCreate: AppRouteHandler<BulkCreateRoute> = async (c) => {
  const { fields } = await c.req.json();
  
  const created = [];
  const errors = [];

  for (let i = 0; i < fields.length; i++) {
    try {
      const [newField] = await db
        .insert(formFields)
        .values(fields[i])
        .returning();
      created.push(newField);
    } catch (error) {
      errors.push({
        index: i,
        error: `Failed to create field at index ${i}`,
      });
    }
  }

  return c.json({ created, errors }, HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.param();
  const fieldId = parseInt(id);
  const field = await db.query.formFields.findFirst({
    where: eq(formFields.id, fieldId),
  });

  if (!field) {
    return c.json(
      {
        message: "Form field not found",
      },
      HttpStatusCodes.NOT_FOUND
    );
  }

  return c.json(field, HttpStatusCodes.OK);
};

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const fieldId = parseInt(id);

  try {
    const [updatedField] = await db
      .update(formFields)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(formFields.id, fieldId))
      .returning();

    if (!updatedField) {
      return c.json(
        {
          message: "Form field not found",
        },
        HttpStatusCodes.NOT_FOUND
      );
    }

    return c.json(updatedField, HttpStatusCodes.OK);
  } catch (error) {
    return c.json(
      {
        error: "UPDATE_FAILED",
        message: "Failed to update form field",
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

export const bulkUpdate: AppRouteHandler<BulkUpdateRoute> = async (c) => {
  const { fields } = await c.req.json();
  
  const updated = [];
  const errors = [];

  for (const field of fields) {
    try {
      const [updatedField] = await db
        .update(formFields)
        .set({
          ...field.data,
          updatedAt: new Date(),
        })
        .where(eq(formFields.id, field.id))
        .returning();

      if (updatedField) {
        updated.push(updatedField);
      }
    } catch (error) {
      errors.push({
        id: field.id,
        error: `Failed to update field with ID ${field.id}`,
      });
    }
  }

  return c.json({ updated, errors }, HttpStatusCodes.OK);
};

export const reorder: AppRouteHandler<ReorderRoute> = async (c) => {
  const { fieldOrders } = await c.req.json();
  
  try {
    const updated = [];

    for (const order of fieldOrders) {
      const [updatedField] = await db
        .update(formFields)
        .set({
          displayOrder: order.displayOrder,
          updatedAt: new Date(),
        })
        .where(eq(formFields.id, order.id))
        .returning();

      if (updatedField) {
        updated.push(updatedField);
      }
    }

    return c.json({
      updated,
      message: `Successfully reordered ${updated.length} fields`,
    }, HttpStatusCodes.OK);
  } catch (error) {
    return c.json(
      {
        error: "REORDER_FAILED",
        message: "Failed to reorder form fields",
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.param();
  const fieldId = parseInt(id);

  const deleted = await db
    .delete(formFields)
    .where(eq(formFields.id, fieldId))
    .returning();

  if (deleted.length === 0) {
    return c.json(
      {
        message: "Form field not found",
      },
      HttpStatusCodes.NOT_FOUND
    );
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const getBySchema: AppRouteHandler<GetBySchemaRoute> = async (c) => {
  const { schemaId } = c.req.param();
  const schemaIdInt = parseInt(schemaId);
  const query = c.req.query();

  const conditions = [eq(formFields.schemaId, schemaIdInt)];
  
  if (query.includeHidden === 'false') {
    conditions.push(eq(formFields.isVisible, true));
  }
  
  if (query.categoryId) {
    conditions.push(eq(formFields.categoryId, parseInt(query.categoryId)));
  }

  const data = await db.query.formFields.findMany({
    where: and(...conditions),
    orderBy: [formFields.displayOrder],
  });

  return c.json(data, HttpStatusCodes.OK);
};