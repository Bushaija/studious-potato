import { eq, and, desc, count, isNull } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { db } from "@/api/db";
import { schemaActivityCategories } from "@/api/db/schema";
import type { AppRouteHandler } from "@/api/lib/types";
import type { 
  ListRoute, 
  CreateRoute, 
  GetOneRoute, 
  UpdateRoute, 
  RemoveRoute,
  GetHierarchyRoute
} from "./categories.routes";
import { categoryListQuerySchema } from "./categories.types"


export const list: AppRouteHandler<ListRoute> = async (c) => {
  // Validate structure (all strings here)
  const rawQuery = categoryListQuerySchema.parse(c.req.query());

  // Cast into usable types
  const query = {
    projectType: rawQuery.projectType,
    facilityType: rawQuery.facilityType,
    moduleType: rawQuery.moduleType,
    parentCategoryId: rawQuery.parentCategoryId
      ? Number(rawQuery.parentCategoryId)
      : undefined,
    isActive: rawQuery.isActive
      ? rawQuery.isActive === "true"
      : undefined,
    includeHierarchy: rawQuery.includeHierarchy === "true",
    page: Number(rawQuery.page) || 1,
    limit: Number(rawQuery.limit) || 20,
  };

  const offset = (query.page - 1) * query.limit;

  const conditions = [];
  if (query.projectType) {
    conditions.push(eq(schemaActivityCategories.projectType, query.projectType));
  }
  if (query.facilityType) {
    conditions.push(eq(schemaActivityCategories.facilityType, query.facilityType));
  }
  if (query.moduleType) {
    conditions.push(eq(schemaActivityCategories.moduleType, query.moduleType));
  }
  if (query.parentCategoryId !== undefined) {
    conditions.push(eq(schemaActivityCategories.parentCategoryId, query.parentCategoryId));
  }
  if (query.isActive !== undefined) {
    conditions.push(eq(schemaActivityCategories.isActive, query.isActive));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db
    .select({ count: count() })
    .from(schemaActivityCategories)
    .where(whereClause);

  const total = Number(totalResult.count);

  const data = await db.query.schemaActivityCategories.findMany({
    where: whereClause,
    orderBy: [schemaActivityCategories.displayOrder, desc(schemaActivityCategories.createdAt)],
    limit: query.limit,
    offset,
  });

  return c.json({
    data,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    },
  });
};


export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const body = await c.req.json();
  
  try {
    const [newCategory] = await db
      .insert(schemaActivityCategories)
      .values(body)
      .returning();

    return c.json(newCategory, HttpStatusCodes.CREATED);
  } catch (error) {
    return c.json(
      {
        error: "CREATION_FAILED",
        message: "Failed to create category",
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.param();
  const categoryId = parseInt(id);
  
  const category = await db.query.schemaActivityCategories.findFirst({
    where: eq(schemaActivityCategories.id, categoryId),
  });

  if (!category) {
    return c.json(
      {
        message: "Category not found",
      },
      HttpStatusCodes.NOT_FOUND
    );
  }

  return c.json(category, HttpStatusCodes.OK);
};

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const categoryId = parseInt(id);

  try {
    const [updatedCategory] = await db
      .update(schemaActivityCategories)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(schemaActivityCategories.id, categoryId))
      .returning();

    if (!updatedCategory) {
      return c.json(
        {
          message: "Category not found",
        },
        HttpStatusCodes.NOT_FOUND
      );
    }

    return c.json(updatedCategory, HttpStatusCodes.OK);
  } catch (error) {
    return c.json(
      {
        error: "UPDATE_FAILED",
        message: "Failed to update category",
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.param();
  const categoryId = parseInt(id);

  const deleted = await db
    .delete(schemaActivityCategories)
    .where(eq(schemaActivityCategories.id, categoryId))
    .returning();

  if (deleted.length === 0) {
    return c.json(
      {
        message: "Category not found",
      },
      HttpStatusCodes.NOT_FOUND
    );
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const getHierarchy: AppRouteHandler<GetHierarchyRoute> = async (c) => {
  const query = c.req.query();

  const conditions = [];
  if (query.projectType) {
    // TODO: Add type checking
    conditions.push(eq(schemaActivityCategories.projectType, query.projectType as any));
  }
  if (query.facilityType) {
    // TODO: Add type checking
    conditions.push(eq(schemaActivityCategories.facilityType, query.facilityType as any));
  }
  if (query.rootOnly === 'true') {
    conditions.push(isNull(schemaActivityCategories.parentCategoryId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const categories = await db.query.schemaActivityCategories.findMany({
    where: whereClause,
    orderBy: [schemaActivityCategories.displayOrder],
  });

  // Build hierarchy structure
  const buildHierarchy = (parentId: number | null = null): { id: number; code: string; name: string; displayOrder: number; children: any[] }[] => {
    return categories
      .filter(cat => cat.parentCategoryId === parentId)
      .map(cat => ({
        id: cat.id,
        code: cat.code,
        name: cat.name,
        displayOrder: cat.displayOrder,
        children: buildHierarchy(cat.id),
      }));
  };

//   const buildHierarchy = (parentId: number | null = null) => {
//     return categories
//       .filter(cat => cat.parentCategoryId === parentId)
//       .map(cat => ({
//         id: cat.id,
//         code: cat.code,
//         name: cat.name,
//         displayOrder: cat.displayOrder,
//         children: buildHierarchy(cat.id),
//       }));
//   };

  const hierarchy = buildHierarchy();
  return c.json(hierarchy, HttpStatusCodes.OK);
};