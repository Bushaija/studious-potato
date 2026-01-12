import { z } from "zod";
import { eq, and, gte, lte, count, sql, desc } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { db } from "@/api/db";
import { reportingPeriods } from "@/api/db/schema";
import type { AppRouteHandler } from "@/api/lib/types";
import type { 
  ListRoute, 
  CreateRoute, 
  GetOneRoute, 
  PatchRoute, 
  RemoveRoute,
  GetCurrentPeriodRoute,
  GetStatsRoute,
  GetByYearRoute
} from "./reporting-periods.routes";
import { insertReportingPeriodSchema, patchReportingPeriodSchema } from "./reporting-periods.types";

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const query = c.req.query();
  const { year, periodType, status, startYear, endYear } = query;
  const limitNum = Number(query.limit ?? 50);
  const offsetNum = Number(query.offset ?? 0)

  // Build where conditions
  const conditions = [];
  if (year) conditions.push(eq(reportingPeriods.year, parseInt(year)));
  if (periodType) conditions.push(eq(reportingPeriods.periodType, periodType));
  if (status) conditions.push(eq(reportingPeriods.status, status));
  if (startYear) conditions.push(gte(reportingPeriods.year, parseInt(startYear)));
  if (endYear) conditions.push(lte(reportingPeriods.year, parseInt(endYear)));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const [totalResult] = await db
    .select({ count: count() })
    .from(reportingPeriods)
    .where(whereClause);

  // Get data with pagination
  const data = await db.query.reportingPeriods.findMany({
    where: whereClause,
    limit: limitNum,
    offset: offsetNum,
    orderBy: [desc(reportingPeriods.year), desc(reportingPeriods.createdAt)],
  });

  const total = totalResult.count;

  return c.json({
    data: data.map(period => ({
      ...period,
      startDate: period.startDate,
      endDate: period.endDate,
      createdAt: period.createdAt!.toISOString(),
      updatedAt: period.updatedAt!.toISOString(),
    })),
    pagination: {
      total,
      limit: limitNum,
      offset: offsetNum,
      hasMore: offsetNum + limitNum < total,
    },
  });
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  try {
    // Get and validate the request body
    const rawBody = await c.req.json();
    
    // Validate against schema - this will throw if validation fails
    const validatedBody = insertReportingPeriodSchema.parse(rawBody);
    
    // Check for existing period with same year and periodType
    const existing = await db.query.reportingPeriods.findFirst({
      where: and(
        eq(reportingPeriods.year, validatedBody.year),
        eq(reportingPeriods.periodType, validatedBody.periodType)
      ),
    });
    
    if (existing) {
      return c.json(
        {
          message: "Reporting period already exists for this year and period type",
          conflictField: "year_period_type",
        },
        HttpStatusCodes.CONFLICT
      );
    }

    const [newPeriod] = await db
    .insert(reportingPeriods)
    .values({
      ...validatedBody,
      startDate: validatedBody.startDate,
      endDate: validatedBody.endDate,
    })
    .returning();

    return c.json(
      {
        ...newPeriod,
        startDate: newPeriod.startDate,
        endDate: newPeriod.endDate,
        createdAt: newPeriod.createdAt!.toISOString(),
        updatedAt: newPeriod.updatedAt!.toISOString(),
      },
      HttpStatusCodes.CREATED
    );
    
  } catch (error) {
    console.error("Error creating reporting period:", error);
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return c.json(
        {
          message: "Validation failed",
          errors: error.issues.map(issue => ({
            path: issue.path.map(String),
            message: issue.message,
          })),
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }
    
    // Handle database constraint errors
    if (error && typeof error === 'object' && 'code' in error) {
      // PostgreSQL unique constraint violation
      if (error.code === '23505') {
        return c.json(
          {
            message: "Reporting period already exists for this year and period type",
            conflictField: "year_period_type",
          },
          HttpStatusCodes.CONFLICT
        );
      }
    }
    
    // Generic error response
    return c.json(
      { 
        message: "Failed to create reporting period",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.param();
  const periodId = parseInt(id);

  const period = await db.query.reportingPeriods.findFirst({
    where: eq(reportingPeriods.id, periodId),
  });

  if (!period) {
    return c.json(
      { message: "Reporting period not found" },
      HttpStatusCodes.NOT_FOUND
    );
  }

  return c.json({
    ...period,
    startDate: period.startDate,
    endDate: period.endDate,
    createdAt: period.createdAt!.toISOString(),
    updatedAt: period.updatedAt!.toISOString(),
  });
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.param();
  const periodId = parseInt(id);
  
  if (isNaN(periodId)) {
    return c.json(
      { message: "Invalid ID parameter" },
      HttpStatusCodes.BAD_REQUEST
    );
  }
  
  try {
    // Get and validate the request body
    const rawBody = await c.req.json();
    console.log('Raw body received:', rawBody);
    
    const validatedBody = patchReportingPeriodSchema.parse(rawBody);
    console.log('Validated body:', validatedBody);
    
    // Check if period exists
    const existing = await db.query.reportingPeriods.findFirst({
      where: eq(reportingPeriods.id, periodId),
    });
    
    if (!existing) {
      return c.json(
        { message: "Reporting period not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }
    
    console.log('Existing period:', existing);
    
    // Check for conflicts if updating year or periodType
    if (validatedBody.year !== undefined || validatedBody.periodType !== undefined) {
      const yearToCheck = validatedBody.year !== undefined ? validatedBody.year : existing.year;
      const periodTypeToCheck = validatedBody.periodType !== undefined ? validatedBody.periodType : existing.periodType;
      
      const conflictCheck = await db.query.reportingPeriods.findFirst({
        where: and(
          eq(reportingPeriods.year, yearToCheck),
          eq(reportingPeriods.periodType, String(periodTypeToCheck)),
          sql`${reportingPeriods.id} != ${periodId}`
        ),
      });
      
      if (conflictCheck) {
        return c.json(
          {
            message: "Another reporting period already exists for this year and period type",
            conflictField: "year_period_type",
          },
          HttpStatusCodes.CONFLICT
        );
      }
    }
    
    // Build update data more carefully
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };
    
    // Only include fields that were actually provided and validated
    if (validatedBody.year !== undefined) {
      updateData.year = validatedBody.year;
    }
    if (validatedBody.periodType !== undefined) {
      updateData.periodType = validatedBody.periodType;
    }
    if (validatedBody.status !== undefined) {
      updateData.status = validatedBody.status;
    }
    
    // Handle dates: the schema stores DATE (no time). Keep as validated YYYY-MM-DD strings
    if (validatedBody.startDate !== undefined) {
      updateData.startDate = validatedBody.startDate; // already validated by Zod
    }
    
    if (validatedBody.endDate !== undefined) {
      updateData.endDate = validatedBody.endDate; // already validated by Zod
    }
    
    console.log('Update data being sent:', updateData);
    
    // Try the update operation
    const result = await db
      .update(reportingPeriods)
      .set(updateData)
      .where(eq(reportingPeriods.id, periodId))
      .returning();
    
    console.log('Update result:', result);
    
    const updatedPeriod = result[0];
    if (!updatedPeriod) {
      return c.json(
        { message: "No rows were updated" },
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
    
    // Format response
    const response = {
      ...updatedPeriod,
      startDate: updatedPeriod.startDate,
      endDate: updatedPeriod.endDate,
      createdAt: updatedPeriod.createdAt!.toISOString(),
      updatedAt: updatedPeriod.updatedAt!.toISOString(),
    };
    
    console.log('Response being sent:', response);
    
    return c.json(response, HttpStatusCodes.OK);
    
  } catch (error) {
    console.error("Detailed error updating reporting period:", error);
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return c.json(
        {
          message: "Validation failed",
          errors: error.issues.map(issue => ({
            path: issue.path.map(String),
            message: issue.message,
          })),
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }
    
    // Handle database constraint errors
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Database error code:', error.code);
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        return c.json(
          {
            message: "Another reporting period already exists for this year and period type",
            conflictField: "year_period_type",
          },
          HttpStatusCodes.CONFLICT
        );
      }
    }
    
    // Return detailed error for debugging
    return c.json(
      { 
        message: "Failed to update reporting period",
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.param();
  const periodId = parseInt(id);

  try {
    // Check if period exists
    const existing = await db.query.reportingPeriods.findFirst({
      where: eq(reportingPeriods.id, periodId),
    });

    if (!existing) {
      return c.json(
        { message: "Reporting period not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    // Check for dependencies (projects, reports, etc.)
    // This would need to be implemented based on your actual schema relationships
    // For now, we'll assume it's safe to delete
    
    await db.delete(reportingPeriods).where(eq(reportingPeriods.id, periodId));

    return c.body(null, HttpStatusCodes.NO_CONTENT);
  } catch (error) {
    console.error("Error deleting reporting period:", error);
    
    // Check if it's a foreign key constraint error
    if (error instanceof Error && error.message.includes('foreign key')) {
      return c.json(
        {
          message: "Cannot delete reporting period due to existing dependencies",
          relatedEntities: ["projects", "reports"], // This should be determined dynamically
        },
        HttpStatusCodes.CONFLICT
      );
    }

    return c.json(
      { message: "Failed to delete reporting period" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getCurrentPeriod: AppRouteHandler<GetCurrentPeriodRoute> = async (c) => {
  const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const currentPeriod = await db.query.reportingPeriods.findFirst({
    where: and(
      eq(reportingPeriods.status, 'ACTIVE'),
      lte(reportingPeriods.startDate, currentDate),
      gte(reportingPeriods.endDate, currentDate)
    ),
    orderBy: [desc(reportingPeriods.year)],
  });

  if (!currentPeriod) {
    return c.json(
      { message: "No current active reporting period found" },
      HttpStatusCodes.NOT_FOUND
    );
  }

  // Simply return the period as-is if your schema handles the serialization
  return c.json(currentPeriod);
};

export const getStats: AppRouteHandler<GetStatsRoute> = async (c) => {
  // Get basic counts
  const [totalCount] = await db
    .select({ count: count() })
    .from(reportingPeriods);

  const [activeCount] = await db
    .select({ count: count() })
    .from(reportingPeriods)
    .where(eq(reportingPeriods.status, 'ACTIVE'));

  // Get year range
  const [yearRange] = await db
    .select({
      earliest: sql<number>`MIN(${reportingPeriods.year})`,
      latest: sql<number>`MAX(${reportingPeriods.year})`,
    })
    .from(reportingPeriods);

  // Get period type distribution
  const periodTypeStats = await db
    .select({
      periodType: reportingPeriods.periodType,
      count: count(),
    })
    .from(reportingPeriods)
    .groupBy(reportingPeriods.periodType);
    
  const periodTypeDistribution = periodTypeStats
    .filter(item => item.periodType !== null)
    .reduce(
      (acc, item) => {
        acc[item.periodType!] = item.count;
        return acc;
      },
      {} as Record<string, number>
    )

  return c.json({
    totalPeriods: totalCount.count,
    activePeriods: activeCount.count,
    yearRange: {
      earliest: yearRange.earliest || 0,
      latest: yearRange.latest || 0,
    },
    periodTypeDistribution,
  });
};

export const getByYear: AppRouteHandler<GetByYearRoute> = async (c) => {
  const { year } = c.req.param();
  
  const periods = await db.query.reportingPeriods.findMany({
    where: eq(reportingPeriods.year, parseInt(year)),
    orderBy: [desc(reportingPeriods.createdAt)],
  });

  return c.json(
    periods.map(period => ({
      ...period,
      startDate: period.startDate,
      endDate: period.endDate,
      createdAt: period.createdAt!.toISOString(),
      updatedAt: period.updatedAt!.toISOString(),
    }))
  );
};