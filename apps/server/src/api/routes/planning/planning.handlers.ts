import { eq, and, inArray, sql } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { db } from "@/api/db";
import { schemaFormDataEntries, dynamicActivities, facilities, projects, reportingPeriods, schemaActivityCategories, formSchemas, users, districts } from "@/api/db/schema";
import type { AppRouteHandler } from "@/api/lib/types";

// TODO: create computation.service & validation.service
import { computationService } from "@/api/lib/services/computation.service";
import { validationService } from "@/api/lib/services/validation.service";
import type {
  ListRoute,
  GetOneRoute,
  CreateRoute,
  UpdateRoute,
  RemoveRoute,
  CalculateTotalsRoute,
  ValidateRoute,
  GetActivitiesRoute,
  GetFormSchemaRoute,
  GetDataSummaryRoute,
  DownloadTemplateRoute,
  UploadFileRoute,
  ReviewPlanningRoute,
  BulkReviewPlanningRoute,
  ApprovePlanningRoute,
  GetApprovalHistoryRoute,
  SubmitForApprovalRoute
} from "./planning.routes";
import { getUserContext, canAccessFacility, hasAdminAccess } from "@/api/lib/utils/get-user-facility";
import { buildFacilityFilter, buildDistrictBasedFacilityFilter, validateDistrictExists } from "@/api/lib/utils/query-filters";
import { fileParserService } from "@/api/lib/services/file-parser.service";
import { approvalService } from "@/lib/services/approval.service";
import { auditService } from "@/lib/services/audit.service";
import { notificationService } from "@/lib/services/notification.service";
import { ApprovalError, ApprovalErrorFactory, isApprovalError } from "@/lib/errors/approval.errors";

/**
 * Helper function to calculate total budget from plan formData
 * @param formData - The formData object containing activities with budgets
 * @returns Total budget amount, or 0 if formData is missing or malformed
 */
function calculatePlanBudget(formData: any): number {
  try {
    if (!formData?.activities) {
      console.warn('FormData missing activities field, returning budget as 0');
      return 0;
    }

    const activities = Object.values(formData.activities);
    const totalBudget = activities.reduce((sum: number, activity: any) => {
      return sum + (activity?.total_budget || 0);
    }, 0);

    return totalBudget;
  } catch (error) {
    console.warn('Error calculating plan budget, returning 0:', error);
    return 0;
  }
}

export const list: AppRouteHandler<ListRoute> = async (c) => {
  try {
    const userContext = await getUserContext(c);
    const isAdmin = hasAdminAccess(userContext.role, userContext.permissions);

    const query = c.req.query();
    const {
      page,
      limit,
      facilityType,
      projectType,
      reportingPeriod,
      approvalStatus, // NEW: Add approval status filter
      districtId, // NEW: Add district filter for admin users
      ...filters
    } = query;

    const limit_ = parseInt(limit);
    const offset = (parseInt(page) - 1) * limit_;

    // Base condition - always filter by entityType
    let whereConditions: any[] = [eq(schemaFormDataEntries.entityType, 'planning')];

    // Add facility filtering logic - district-based for admin users, facility-based for others
    try {
      if (isAdmin && districtId) {
        // Admin with district filter: validate and filter by specific district
        const isValidDistrict = await validateDistrictExists(parseInt(districtId));
        if (!isValidDistrict) {
          return c.json(
            { message: "Invalid district ID provided" },
            HttpStatusCodes.BAD_REQUEST
          );
        }

        const districtFilter = await buildDistrictBasedFacilityFilter(parseInt(districtId));
        if (districtFilter) {
          whereConditions.push(districtFilter);
        }
      } else {
        // Non-admin users or admin without district filter: use existing facility-based filtering
        const requestedFacilityId = filters.facilityId ? parseInt(filters.facilityId) : undefined;
        const facilityFilter = buildFacilityFilter(userContext, requestedFacilityId);

        if (facilityFilter) {
          whereConditions.push(facilityFilter);
        }
      }
    } catch (error: any) {
      if (error.message === "Access denied: facility not in your district") {
        return c.json({
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
          message: "Access denied: facility not in your district"
        }, HttpStatusCodes.FORBIDDEN);
      }
      throw error;
    }

    // Direct ID filters
    if (filters.projectId) {
      whereConditions.push(eq(schemaFormDataEntries.projectId, parseInt(filters.projectId)));
    }
    if (filters.reportingPeriodId) {
      whereConditions.push(eq(schemaFormDataEntries.reportingPeriodId, parseInt(filters.reportingPeriodId)));
    }

    // NEW: Add approval status filter
    if (approvalStatus) {
      whereConditions.push(eq(schemaFormDataEntries.approvalStatus, approvalStatus as any));
    }

    // Build query with joins - separate queries for admin and non-admin users
    let results: any[];
    
    if (isAdmin) {
      // Admin query with district information
      const adminQuery = db
        .select({
          entry: schemaFormDataEntries,
          facility: facilities,
          project: projects,
          reportingPeriod: reportingPeriods,
          district: districts,
        })
        .from(schemaFormDataEntries)
        .leftJoin(facilities, eq(schemaFormDataEntries.facilityId, facilities.id))
        .leftJoin(projects, eq(schemaFormDataEntries.projectId, projects.id))
        .leftJoin(reportingPeriods, eq(schemaFormDataEntries.reportingPeriodId, reportingPeriods.id))
        .leftJoin(districts, eq(facilities.districtId, districts.id))
        .where(and(...whereConditions));
      
      results = await adminQuery;
    } else {
      // Non-admin query without district information
      const nonAdminQuery = db
        .select({
          entry: schemaFormDataEntries,
          facility: facilities,
          project: projects,
          reportingPeriod: reportingPeriods,
        })
        .from(schemaFormDataEntries)
        .leftJoin(facilities, eq(schemaFormDataEntries.facilityId, facilities.id))
        .leftJoin(projects, eq(schemaFormDataEntries.projectId, projects.id))
        .leftJoin(reportingPeriods, eq(schemaFormDataEntries.reportingPeriodId, reportingPeriods.id))
        .where(and(...whereConditions));
      
      results = await nonAdminQuery;
    }



    // Apply additional filters on the result set
    let filteredResults = results;

    if (facilityType) {
      filteredResults = filteredResults.filter(r =>
        r.facility?.facilityType === facilityType
      );
    }

    if (projectType) {
      filteredResults = filteredResults.filter(r =>
        r.project?.projectType === projectType
      );
    }

    if (reportingPeriod) {
      const year = parseInt(reportingPeriod);
      if (!isNaN(year)) {
        filteredResults = filteredResults.filter(r =>
          r.reportingPeriod?.year === year
        );
      }
    }

    // Calculate pagination after filtering
    const total = filteredResults.length;
    const paginatedResults = filteredResults.slice(offset, offset + limit_);

    // Fetch full details for paginated results
    const entryIds = paginatedResults.map(r => r.entry.id);

    const data = await db.query.schemaFormDataEntries.findMany({
      where: (entries, { inArray }) => inArray(entries.id, entryIds),
      with: {
        schema: true,
        project: true,
        facility: true,
        reportingPeriod: true,
        creator: {
          columns: { id: true, name: true, email: true }
        },
        reviewer: {
          columns: { id: true, name: true, email: true }
        }
      },
      orderBy: (entries, { desc }) => [desc(entries.updatedAt)],
    });

    const totalPages = Math.ceil(total / limit_);

    // Enhance with activity names
    try {
      const cache = new Map<string, Map<string, string>>();
      const enhance = async (item: any) => {
        const projectType = item?.schema?.projectType;
        const facilityType = item?.schema?.facilityType;
        const key = `${projectType}|${facilityType}`;

        if (!cache.has(key)) {
          const activities = await db
            .select({ id: dynamicActivities.id, name: dynamicActivities.name })
            .from(dynamicActivities)
            .where(
              and(
                eq(dynamicActivities.projectType, projectType as any),
                eq(dynamicActivities.facilityType, facilityType as any),
                eq(dynamicActivities.isActive, true)
              )
            );
          const map = new Map<string, string>();
          for (const a of activities) map.set(String(a.id), a.name);
          cache.set(key, map);
        }

        const idToName = cache.get(key)!;
        const src = item?.formData?.activities;
        if (src && typeof src === 'object') {
          const named: Record<string, any> = {};
          for (const [id, value] of Object.entries(src)) {
            const name = idToName.get(String(id)) || String(id);
            named[name] = value;
          }
          (item as any).formDataNamed = { ...item.formData, activities: named };
        }
        return item;
      };

      const enhanced = await Promise.all(data.map(enhance));

      // Add district information for admin users
      const enhancedWithDistrict = isAdmin 
        ? enhanced.map(entry => {
            // Find the corresponding result with district info
            const resultWithDistrict = results.find(r => r.entry.id === entry.id);
            return {
              ...entry,
              district: resultWithDistrict?.district ? {
                id: resultWithDistrict.district.id,
                name: resultWithDistrict.district.name,
              } : null,
            };
          })
        : enhanced;

      return c.json({
        data: enhancedWithDistrict,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
        filters: {
          facilityType: facilityType || undefined,
          projectType: projectType || undefined,
          reportingPeriod: reportingPeriod || undefined,
          approvalStatus: approvalStatus || undefined,
          // Include district filter in response for admin users
          ...(isAdmin && districtId && { district: districtId }),
        },
      });
    } catch (e) {
      console.error('Enhancement failed:', e);
      
      // Add district information for admin users even in fallback
      const dataWithDistrict = isAdmin 
        ? data.map(entry => {
            const resultWithDistrict = results.find(r => r.entry.id === entry.id);
            return {
              ...entry,
              district: resultWithDistrict?.district ? {
                id: resultWithDistrict.district.id,
                name: resultWithDistrict.district.name,
              } : null,
            };
          })
        : data;

      return c.json({
        data: dataWithDistrict,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
        filters: {
          facilityType: facilityType || undefined,
          projectType: projectType || undefined,
          reportingPeriod: reportingPeriod || undefined,
          approvalStatus: approvalStatus || undefined,
          // Include district filter in response for admin users
          ...(isAdmin && districtId && { district: districtId }),
        },
      });
    }
  } catch (error: any) {
    console.error('List planning error:', error);

    if (error.message === "Unauthorized") {
      return c.json(
        { message: "Authentication required" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    if (error.message === "User not associated with a facility") {
      return c.json(
        { message: "User must be associated with a facility" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    return c.json(
      { message: "Failed to fetch planning data" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

// function normalizeFormData(formData: any) {
//   const normalized = { ...formData };

//   // Add activity metadata to each activity
//   if (normalized.activities) {
//     for (const [_activityId, activityData] of Object.entries(normalized.activities)) {
//       const activity = activityData as any;

//       // Add computed amounts directly to form data
//       const unitCost = parseFloat(activity.unit_cost) || 0;
//       const frequency = parseFloat(activity.frequency) || 1;
//       const q1Count = parseFloat(activity.q1_count) || 0;
//       const q2Count = parseFloat(activity.q2_count) || 0;
//       const q3Count = parseFloat(activity.q3_count) || 0;
//       const q4Count = parseFloat(activity.q4_count) || 0;

//       activity.q1_amount = frequency * unitCost * q1Count;
//       activity.q2_amount = frequency * unitCost * q2Count;
//       activity.q3_amount = frequency * unitCost * q3Count;
//       activity.q4_amount = frequency * unitCost * q4Count;
//       activity.total_budget = activity.q1_amount + activity.q2_amount + activity.q3_amount + activity.q4_amount;
//     }
//   }

//   return normalized;
// }

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.param();
  const planningId = parseInt(id);

  try {
    // Get user context with district information
    const userContext = await getUserContext(c);

    const data = await db.query.schemaFormDataEntries.findFirst({
      where: and(
        eq(schemaFormDataEntries.id, planningId),
        eq(schemaFormDataEntries.entityType, 'planning')
      ),
      with: {
        schema: true,
        project: true,
        facility: true,
        reportingPeriod: true,
        creator: {
          columns: { id: true, name: true, email: true }
        },
        reviewer: {
          columns: { id: true, name: true, email: true }
        }
      },
    });

    if (!data) {
      return c.json(
        { message: "Planning data not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    // Validate that the user can access this record's facility
    const recordFacilityId = data.facilityId;
    const hasAccess = canAccessFacility(recordFacilityId, userContext);

    if (!hasAccess) {
      return c.json(
        { message: "Access denied: facility not in your district" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    try {
      const projectType = (data as any)?.schema?.projectType;
      const facilityType = (data as any)?.schema?.facilityType;
      const activities = await db
        .select({ id: dynamicActivities.id, name: dynamicActivities.name })
        .from(dynamicActivities)
        .where(
          and(
            eq(dynamicActivities.projectType, projectType as any),
            eq(dynamicActivities.facilityType, facilityType as any),
            eq(dynamicActivities.isActive, true)
          )
        );
      const idToName = new Map<string, string>();
      for (const a of activities) idToName.set(String(a.id), a.name);
      const src = (data as any)?.formData?.activities;
      if (src && typeof src === 'object') {
        const named: Record<string, any> = {};
        for (const [id, value] of Object.entries(src)) {
          const name = idToName.get(String(id)) || String(id);
          named[name] = value;
        }
        (data as any).formDataNamed = { ...(data as any).formData, activities: named };
      }
    } catch { }

    return c.json(data);
  } catch (error: any) {
    console.error('GetOne planning error:', error);

    if (error.message === "Unauthorized") {
      return c.json(
        { message: "Authentication required" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    if (error.message === "User not associated with a facility") {
      return c.json(
        { message: "User must be associated with a facility" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    return c.json(
      { message: "Failed to fetch planning data" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const body = await c.req.json();

  try {
    // Get user context with district information
    const userContext = await getUserContext(c);

    // Determine the facilityId to use based on user type
    let validatedFacilityId: number;

    if (hasAdminAccess(userContext.role, userContext.permissions)) {
      // Admin users: require explicit facilityId and allow any facility
      if (!body.facilityId) {
        return c.json(
          { message: "Admin users must provide an explicit facilityId" },
          HttpStatusCodes.BAD_REQUEST
        );
      }
      validatedFacilityId = body.facilityId;
    } else if (userContext.facilityType === 'hospital') {
      // Hospital accountants: allow any facility in their district
      if (!body.facilityId) {
        return c.json(
          { message: "facilityId is required" },
          HttpStatusCodes.BAD_REQUEST
        );
      }

      // Validate that the requested facility is in the user's district
      if (!userContext.accessibleFacilityIds.includes(body.facilityId)) {
        return c.json(
          { message: "Access denied: facility not in your district" },
          HttpStatusCodes.FORBIDDEN
        );
      }

      validatedFacilityId = body.facilityId;
    } else {
      // Health center users: override facilityId with their own facility
      validatedFacilityId = userContext.facilityId;
    }

    // Check if planning already exists for this facility/project/reporting period
    const existingPlanning = await db.query.schemaFormDataEntries.findFirst({
      where: and(
        eq(schemaFormDataEntries.facilityId, validatedFacilityId),
        eq(schemaFormDataEntries.projectId, body.projectId),
        eq(schemaFormDataEntries.entityType, 'planning'),
        eq(schemaFormDataEntries.reportingPeriodId, body.reportingPeriodId)
      ),
    });

    if (existingPlanning) {
      return c.json(
        {
          message: "Planning already exists for this facility, program, and reporting period",
          existingPlanningId: existingPlanning.id
        },
        HttpStatusCodes.CONFLICT
      );
    }

    // Normalize incoming form data (coerce frequency to integer and numeric fields)
    const normalizedFormData = normalizeFormData(body.formData);

    // Validate form data against schema
    const validationResult = await validationService.validateFormData(
      body.schemaId,
      normalizedFormData
    );

    if (!validationResult.isValid) {
      return c.json(
        {
          message: "Validation failed",
          errors: validationResult.errors
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    const computedValues = await calculateNestedComputedValues(normalizedFormData);

    const [result] = await db.insert(schemaFormDataEntries).values({
      schemaId: body.schemaId,
      entityId: body.activityId ?? undefined,
      entityType: 'planning',
      projectId: body.projectId,
      facilityId: validatedFacilityId, // Use validated facilityId
      reportingPeriodId: body.reportingPeriodId,
      formData: normalizedFormData,
      computedValues: computedValues,
      validationState: { isValid: true, lastValidated: new Date().toISOString() },
      metadata: {
        ...body.metadata || {},
        // Creator identity tracking for audit purposes
        createdBy: userContext.userId,
        createdAt: new Date().toISOString(),
        submissionSource: 'manual_creation',
        // Generate unique identifier for submitted plan
        submissionId: `PLAN_${Date.now()}_${userContext.userId}`,
        // Timestamp for submitted plan
        submittedAt: new Date().toISOString(),
      },
      // Set default approval status to PENDING
      approvalStatus: 'PENDING',
      createdBy: userContext.userId,
      updatedBy: userContext.userId,
    }).returning();

    const created = await db.query.schemaFormDataEntries.findFirst({
      where: eq(schemaFormDataEntries.id, result.id),
      with: {
        schema: true,
        project: true,
        facility: true,
        reportingPeriod: true,
        creator: {
          columns: { id: true, name: true, email: true }
        },
        reviewer: {
          columns: { id: true, name: true, email: true }
        }
      },
    });

    // Send notification to admins about pending review
    try {
      const adminIds = await notificationService.getAdminUsersForNotification();
      if (adminIds.length > 0) {
        await notificationService.notifyPendingReview(result.id, adminIds);
      }
    } catch (notificationError) {
      console.error('Failed to send pending review notification:', notificationError);
      // Don't fail the creation if notification fails
    }

    return c.json(created, HttpStatusCodes.CREATED);
  } catch (error: any) {
    console.error('Create planning error:', error);

    if (error.message === "Unauthorized") {
      return c.json(
        { message: "Authentication required" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    if (error.message === "User not associated with a facility") {
      return c.json(
        { message: "User must be associated with a facility" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    return c.json(
      { message: "Failed to create planning data" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const planningId = parseInt(id);

  try {
    // Get user context with district information
    const userContext = await getUserContext(c);

    const existing = await db.query.schemaFormDataEntries.findFirst({
      where: and(
        eq(schemaFormDataEntries.id, planningId),
        eq(schemaFormDataEntries.entityType, 'planning')
      ),
    });

    if (!existing) {
      return c.json(
        { message: "Planning data not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    // Validate that the user can access this record's facility
    const recordFacilityId = existing.facilityId;
    const hasAccess = canAccessFacility(recordFacilityId, userContext);

    if (!hasAccess) {
      return c.json(
        { message: "Access denied: facility not in your district" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // If facilityId is being changed, validate access to the new facility
    if (body.facilityId && body.facilityId !== existing.facilityId) {
      // Admin users can change to any facility
      if (!hasAdminAccess(userContext.role, userContext.permissions)) {
        // Non-admin users: validate access to new facility
        if (userContext.facilityType === 'hospital') {
          // Hospital accountants: must be in their district
          if (!userContext.accessibleFacilityIds.includes(body.facilityId)) {
            return c.json(
              { message: "Access denied: new facility not in your district" },
              HttpStatusCodes.FORBIDDEN
            );
          }
        } else {
          // Health center users: cannot change facility
          return c.json(
            { message: "Health center users cannot change facility" },
            HttpStatusCodes.FORBIDDEN
          );
        }
      }
    }

    // Merge existing form data with updates
    const updatedFormData = {
      ...existing.formData as any,
      ...body.formData,
    };

    // Normalize the updated form data
    const normalizedFormData = normalizeFormData(updatedFormData);

    // Validate updated data
    if (body.formData) {
      const validationResult = await validationService.validateFormData(
        existing.schemaId,
        normalizedFormData
      );

      if (!validationResult.isValid) {
        return c.json(
          {
            message: "Validation failed",
            errors: validationResult.errors
          },
          HttpStatusCodes.BAD_REQUEST
        );
      }
    }

    // Recalculate computed values with nested structure
    const computedValues = await calculateNestedComputedValues(normalizedFormData);

    // Determine if approval status should be reset to PENDING
    // When an accountant updates a REJECTED plan, it should go back to PENDING for re-review
    const shouldResetToPending = existing.approvalStatus === 'REJECTED' && 
                                  userContext.role === 'accountant';

    const updateData: any = {
      ...body,
      formData: normalizedFormData,
      computedValues: computedValues,
      validationState: { isValid: true, lastValidated: new Date().toISOString() },
      updatedBy: userContext.userId,
      updatedAt: new Date(),
    };

    // Reset approval status to PENDING if accountant is updating a rejected plan
    if (shouldResetToPending) {
      updateData.approvalStatus = 'PENDING';
      updateData.reviewedBy = null;
      updateData.reviewedAt = null;
      updateData.reviewComments = null;
    }

    await db.update(schemaFormDataEntries)
      .set(updateData)
      .where(eq(schemaFormDataEntries.id, planningId));

    // Send notification to admins if a rejected plan was resubmitted for review
    if (shouldResetToPending) {
      try {
        const adminIds = await notificationService.getAdminUsersForNotification();
        if (adminIds.length > 0) {
          await notificationService.notifyPendingReview(planningId, adminIds);
        }
      } catch (notificationError) {
        console.error('Failed to send resubmission notification:', notificationError);
        // Don't fail the update if notification fails
      }
    }

    const updated = await db.query.schemaFormDataEntries.findFirst({
      where: eq(schemaFormDataEntries.id, planningId),
      with: {
        schema: true,
        project: true,
        facility: true,
        reportingPeriod: true,
        creator: {
          columns: { id: true, name: true, email: true }
        },
        reviewer: {
          columns: { id: true, name: true, email: true }
        }
      },
    });

    return c.json(updated);
  } catch (error: any) {
    console.error('Update planning error:', error);

    if (error.message === "Unauthorized") {
      return c.json(
        { message: "Authentication required" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    if (error.message === "User not associated with a facility") {
      return c.json(
        { message: "User must be associated with a facility" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    return c.json(
      { message: "Failed to update planning data" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.param();
  const planningId = parseInt(id);

  const existing = await db.query.schemaFormDataEntries.findFirst({
    where: and(
      eq(schemaFormDataEntries.id, planningId),
      eq(schemaFormDataEntries.entityType, 'planning')
    ),
  });

  if (!existing) {
    return c.json(
      { message: "Planning data not found" },
      HttpStatusCodes.NOT_FOUND
    );
  }

  await db.delete(schemaFormDataEntries)
    .where(eq(schemaFormDataEntries.id, planningId));

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const calculateTotals: AppRouteHandler<CalculateTotalsRoute> = async (c) => {
  const body = await c.req.json();

  try {
    const totals = await computationService.calculatePlanningTotals(
      body.planningId,
      body.data
    );

    return c.json(totals);
  } catch (error) {
    return c.json(
      { message: "Failed to calculate totals" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const validate: AppRouteHandler<ValidateRoute> = async (c) => {
  const body = await c.req.json();

  try {
    const result = await validationService.validateFormData(
      body.schemaId,
      body.data,
      body.context
    );

    const computedValues = await computationService.calculateValues(
      body.schemaId,
      body.data
    );

    return c.json({
      isValid: result.isValid,
      errors: result.errors,
      computedValues: computedValues.computedValues,
    });
  } catch (error) {
    return c.json(
      { message: "Failed to validate data" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getActivities: AppRouteHandler<GetActivitiesRoute> = async (c) => {
  const { projectType, facilityType } = c.req.query();

  // Normalize inputs
  const validProjectTypes = ['HIV', 'Malaria', 'TB'];
  const validFacilityTypes = ['hospital', 'health_center'];

  const finalProjectType = projectType && validProjectTypes.includes(projectType)
    ? projectType as 'HIV' | 'Malaria' | 'TB'
    : 'HIV';

  const finalFacilityType = facilityType && validFacilityTypes.includes(facilityType)
    ? facilityType as 'hospital' | 'health_center'
    : 'hospital';

  try {
    const activities = await db
      .select({
        id: dynamicActivities.id,
        name: dynamicActivities.name,
        code: dynamicActivities.code,
        activityType: dynamicActivities.activityType,
        displayOrder: dynamicActivities.displayOrder,
        isAnnualOnly: dynamicActivities.isAnnualOnly,
        isTotalRow: dynamicActivities.isTotalRow,
        categoryId: dynamicActivities.categoryId,
        categoryName: schemaActivityCategories.name,
        categoryCode: schemaActivityCategories.code,
        categoryDisplayOrder: schemaActivityCategories.displayOrder
      })
      .from(dynamicActivities)
      .innerJoin(
        schemaActivityCategories,
        eq(dynamicActivities.categoryId, schemaActivityCategories.id)
      )
      .where(
        and(
          eq(dynamicActivities.projectType, finalProjectType as any),
          eq(dynamicActivities.facilityType, finalFacilityType),
          eq(dynamicActivities.moduleType, 'planning'), // ✅ CRITICAL: Add this line
          eq(dynamicActivities.isActive, true),
          eq(schemaActivityCategories.isActive, true),
          eq(schemaActivityCategories.moduleType, 'planning') // ✅ Double-check category
        )
      )
      .orderBy(
        schemaActivityCategories.displayOrder,
        dynamicActivities.displayOrder
      );

    // Verify no execution activities leaked through
    if (activities.length > 0) {
      const hasInvalidModule = activities.some(a =>
        a.code?.includes('EXEC')
      );

      if (hasInvalidModule) {
        console.error('⚠️ Warning: Execution activities detected in planning query!');
      }
    }

    return c.json({
      data: activities,
      meta: {
        projectType: finalProjectType,
        facilityType: finalFacilityType,
        moduleType: 'planning',
        count: activities.length
      }
    });
  } catch (error) {
    console.error('Error in getActivities (planning):', error);
    console.error('Error stack:', (error as any)?.stack);
    return c.json(
      {
        message: "Failed to fetch planning activities",
        debug: {
          projectType: finalProjectType,
          facilityType: finalFacilityType,
          error: (error as any)?.message
        }
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getFormSchema: AppRouteHandler<GetFormSchemaRoute> = async (c) => {
  const { projectType, facilityType } = c.req.query();

  try {
    const formSchema = await db
      .select({
        id: formSchemas.id,
        name: formSchemas.name,
        version: formSchemas.version,
        schema: formSchemas.schema,
        metadata: formSchemas.metadata
      })
      .from(formSchemas)
      .where(
        and(
          eq(formSchemas.projectType, projectType as any),
          eq(formSchemas.facilityType, facilityType as any),
          eq(formSchemas.moduleType, 'planning'),
          eq(formSchemas.isActive, true)
        )
      )
      .limit(1);

    if (!formSchema[0]) {
      return c.json(
        { message: "Form schema not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    return c.json({ data: formSchema[0] });
  } catch (error) {
    return c.json(
      { message: "Failed to fetch form schema" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getDataSummary: AppRouteHandler<GetDataSummaryRoute> = async (c) => {
  const { projectId, facilityId, reportingPeriodId } = c.req.query();

  try {
    const whereClause = reportingPeriodId
      ? and(
        eq(schemaFormDataEntries.projectId, parseInt(projectId)),
        eq(schemaFormDataEntries.facilityId, parseInt(facilityId)),
        eq(schemaFormDataEntries.reportingPeriodId, parseInt(reportingPeriodId)),
        eq(schemaFormDataEntries.entityType, 'planning')
      )
      : and(
        eq(schemaFormDataEntries.projectId, parseInt(projectId)),
        eq(schemaFormDataEntries.facilityId, parseInt(facilityId)),
        eq(schemaFormDataEntries.entityType, 'planning')
      );

    // First try to get planning data with joins (for per-activity storage)
    const planningDataWithJoins = await db
      .select({
        id: schemaFormDataEntries.id,
        entityId: schemaFormDataEntries.entityId,
        formData: schemaFormDataEntries.formData,
        computedValues: schemaFormDataEntries.computedValues,
        metadata: schemaFormDataEntries.metadata,
        activityName: dynamicActivities.name,
        activityCode: dynamicActivities.code,
        categoryName: schemaActivityCategories.name,
        categoryCode: schemaActivityCategories.code
      })
      .from(schemaFormDataEntries)
      .innerJoin(
        dynamicActivities,
        eq(schemaFormDataEntries.entityId, dynamicActivities.id)
      )
      .innerJoin(
        schemaActivityCategories,
        eq(dynamicActivities.categoryId, schemaActivityCategories.id)
      )
      .where(whereClause)
      .orderBy(
        schemaActivityCategories.displayOrder,
        dynamicActivities.displayOrder
      );

    // If no data with joins, try getting raw planning data (for JSON storage)
    if (planningDataWithJoins.length === 0) {
      const rawPlanningData = await db
        .select({
          id: schemaFormDataEntries.id,
          computedValues: schemaFormDataEntries.computedValues,
        })
        .from(schemaFormDataEntries)
        .where(whereClause);

      // Extract only the quarterly totals from computedValues for efficiency
      const summary = rawPlanningData.map(item => ({
        id: item.id,
        quarterlyTotals: item.computedValues?.totals ? {
          q1_total: item.computedValues.totals.q1_total,
          q2_total: item.computedValues.totals.q2_total,
          q3_total: item.computedValues.totals.q3_total,
          q4_total: item.computedValues.totals.q4_total,
          annual_total: item.computedValues.totals.annual_total,
        } : null
      }));

      return c.json({ data: summary });
    }

    return c.json({ data: planningDataWithJoins });
  } catch (error) {
    console.error('Error fetching planning data summary:', error);
    return c.json(
      { message: "Failed to fetch planning data summary" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};


// create helper functions

// Add this function to planning.handlers.ts
async function calculateNestedComputedValues(formData: any) {
  const computedValues: any = {
    activities: {},
    totals: {
      q1_total: 0,
      q2_total: 0,
      q3_total: 0,
      q4_total: 0,
      annual_total: 0,
      activity_count: 0
    },
    summary: {
      by_category: {},
      by_activity_type: {}
    }
  };

  // Process each activity in the nested structure
  if (formData.activities) {
    for (const [activityId, activityData] of Object.entries(formData.activities)) {
      const activity = activityData as any;

      // Parse and validate input values
      const unitCost = parseFloat(activity.unit_cost) || 0;
      const frequency = parseFloat(activity.frequency) || 1;
      const q1CountRaw = parseFloat(activity.q1_count) || 0;
      const q2CountRaw = parseFloat(activity.q2_count) || 0;
      const q3CountRaw = parseFloat(activity.q3_count) || 0;
      const q4CountRaw = parseFloat(activity.q4_count) || 0;

      // Enforce applicable quarters from parsed activity data (default to all quarters)
      const applicableQuarters: string[] = Array.isArray(activity.applicable_quarters)
        ? activity.applicable_quarters
        : ['Q1', 'Q2', 'Q3', 'Q4'];

      const q1Count = applicableQuarters.includes('Q1') ? q1CountRaw : 0;
      const q2Count = applicableQuarters.includes('Q2') ? q2CountRaw : 0;
      const q3Count = applicableQuarters.includes('Q3') ? q3CountRaw : 0;
      const q4Count = applicableQuarters.includes('Q4') ? q4CountRaw : 0;

      // Calculate quarterly amounts using consistent formula
      const q1Amount = frequency * unitCost * q1Count;
      const q2Amount = frequency * unitCost * q2Count;
      const q3Amount = frequency * unitCost * q3Count;
      const q4Amount = frequency * unitCost * q4Count;

      // Calculate totals
      const totalBudget = q1Amount + q2Amount + q3Amount + q4Amount;
      const totalCount = q1Count + q2Count + q3Count + q4Count;
      const averageQuarterlyAmount = totalBudget / 4;
      const averageQuarterlyCount = totalCount / 4;

      // Get activity metadata
      const activityName = await getActivityName(activityId);
      const activityType = await getActivityType(activityId);
      const categoryCode = await getCategoryCode(activityId);

      // Store comprehensive computed values for this activity
      computedValues.activities[activityId] = {
        // Core calculations
        q1_amount: q1Amount,
        q2_amount: q2Amount,
        q3_amount: q3Amount,
        q4_amount: q4Amount,
        total_budget: totalBudget,

        // Additional computed fields
        total_count: totalCount,
        average_quarterly_amount: averageQuarterlyAmount,
        average_quarterly_count: averageQuarterlyCount,
        cost_per_unit_per_year: unitCost * frequency,

        // Metadata for easier processing
        activity_name: activityName,
        activity_type: activityType,
        category_code: categoryCode,

        // Data quality indicators
        has_budget: totalBudget > 0,
        has_activity: totalCount > 0,
        is_consistent: frequency > 0 && unitCost >= 0,

        // Quarterly distribution analysis
        quarterly_distribution: {
          q1_percentage: totalBudget > 0 ? (q1Amount / totalBudget) * 100 : 0,
          q2_percentage: totalBudget > 0 ? (q2Amount / totalBudget) * 100 : 0,
          q3_percentage: totalBudget > 0 ? (q3Amount / totalBudget) * 100 : 0,
          q4_percentage: totalBudget > 0 ? (q4Amount / totalBudget) * 100 : 0,
          is_evenly_distributed: Math.abs(Math.max(q1Amount, q2Amount, q3Amount, q4Amount) -
            Math.min(q1Amount, q2Amount, q3Amount, q4Amount)) < (totalBudget * 0.1)
        }
      };

      // Aggregate totals
      computedValues.totals.q1_total += q1Amount;
      computedValues.totals.q2_total += q2Amount;
      computedValues.totals.q3_total += q3Amount;
      computedValues.totals.q4_total += q4Amount;
      computedValues.totals.annual_total += totalBudget;
      computedValues.totals.activity_count += 1;

      // Group by category
      if (!computedValues.summary.by_category[categoryCode]) {
        computedValues.summary.by_category[categoryCode] = {
          total_budget: 0,
          activity_count: 0,
          q1_total: 0,
          q2_total: 0,
          q3_total: 0,
          q4_total: 0
        };
      }
      computedValues.summary.by_category[categoryCode].total_budget += totalBudget;
      computedValues.summary.by_category[categoryCode].activity_count += 1;
      computedValues.summary.by_category[categoryCode].q1_total += q1Amount;
      computedValues.summary.by_category[categoryCode].q2_total += q2Amount;
      computedValues.summary.by_category[categoryCode].q3_total += q3Amount;
      computedValues.summary.by_category[categoryCode].q4_total += q4Amount;

      // Group by activity type
      if (!computedValues.summary.by_activity_type[activityType]) {
        computedValues.summary.by_activity_type[activityType] = {
          total_budget: 0,
          activity_count: 0
        };
      }
      computedValues.summary.by_activity_type[activityType].total_budget += totalBudget;
      computedValues.summary.by_activity_type[activityType].activity_count += 1;
    }
  }

  // Calculate overall averages and percentages
  if (computedValues.totals.activity_count > 0) {
    computedValues.totals.average_activity_budget = computedValues.totals.annual_total / computedValues.totals.activity_count;
    computedValues.totals.quarterly_averages = {
      q1_average: computedValues.totals.q1_total / computedValues.totals.activity_count,
      q2_average: computedValues.totals.q2_total / computedValues.totals.activity_count,
      q3_average: computedValues.totals.q3_total / computedValues.totals.activity_count,
      q4_average: computedValues.totals.q4_total / computedValues.totals.activity_count
    };
  }

  return computedValues;
}

// Helper functions to get activity metadata
async function getActivityName(activityId: string): Promise<string> {
  const activity = await db.query.dynamicActivities.findFirst({
    where: eq(dynamicActivities.id, parseInt(activityId))
  });
  return activity?.name || 'Unknown Activity';
}

async function getActivityType(activityId: string): Promise<string> {
  const activity = await db.query.dynamicActivities.findFirst({
    where: eq(dynamicActivities.id, parseInt(activityId))
  });
  return activity?.activityType || 'UNKNOWN';
}

async function getCategoryCode(activityId: string): Promise<string> {
  const activity = await db.query.dynamicActivities.findFirst({
    where: eq(dynamicActivities.id, parseInt(activityId)),
    with: {
      category: true
    }
  });
  return activity?.category?.code || 'UNKNOWN';
}

// UPLOAD FILE HANDLER
export const uploadFile: AppRouteHandler<UploadFileRoute> = async (c) => {
  try {
    console.log('Upload file handler started');
    const userContext = await getUserContext(c);
    console.log('User context obtained:', { userId: userContext.userId, facilityType: userContext.facilityType });

    const body = await c.req.json();
    console.log('Request body parsed:', {
      projectId: body.projectId,
      facilityId: body.facilityId,
      reportingPeriodId: body.reportingPeriodId,
      projectType: body.projectType,
      facilityType: body.facilityType,
      fileName: body.fileName
    });

    // Determine facility to use (same logic as create handler)
    let validatedFacilityId: number;

    if (hasAdminAccess(userContext.role, userContext.permissions)) {
      if (!body.facilityId) {
        return c.json(
          {
            success: false,
            errors: ["Admin users must provide an explicit facilityId"],
            message: "Facility ID required"
          },
          HttpStatusCodes.BAD_REQUEST
        );
      }
      validatedFacilityId = body.facilityId;
    } else if (userContext.facilityType === 'hospital') {
      if (!body.facilityId) {
        return c.json(
          {
            success: false,
            errors: ["facilityId is required"],
            message: "Facility ID required"
          },
          HttpStatusCodes.BAD_REQUEST
        );
      }

      if (!userContext.accessibleFacilityIds.includes(body.facilityId)) {
        return c.json(
          {
            success: false,
            errors: ["Access denied: facility not in your district"],
            message: "Access denied"
          },
          HttpStatusCodes.FORBIDDEN
        );
      }

      validatedFacilityId = body.facilityId;
    } else {
      validatedFacilityId = userContext.facilityId;
    }

    // Check for existing planning
    console.log('Checking for existing planning with params:', {
      facilityId: validatedFacilityId,
      projectId: body.projectId,
      reportingPeriodId: body.reportingPeriodId
    });

    let existingPlanning;
    try {
      // First, try a simple count query to test table access
      console.log('Testing table access with count query...');
      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(schemaFormDataEntries)
        .limit(1);
      console.log('Table access test successful, count result:', countResult);

      // Now try the actual query
      existingPlanning = await db
        .select({
          id: schemaFormDataEntries.id,
          facilityId: schemaFormDataEntries.facilityId,
          projectId: schemaFormDataEntries.projectId,
          reportingPeriodId: schemaFormDataEntries.reportingPeriodId,
          entityType: schemaFormDataEntries.entityType,
          approvalStatus: schemaFormDataEntries.approvalStatus,
          createdBy: schemaFormDataEntries.createdBy,
          sourceFileName: schemaFormDataEntries.sourceFileName
        })
        .from(schemaFormDataEntries)
        .where(
          and(
            eq(schemaFormDataEntries.facilityId, validatedFacilityId),
            eq(schemaFormDataEntries.projectId, body.projectId),
            eq(schemaFormDataEntries.entityType, 'planning'),
            eq(schemaFormDataEntries.reportingPeriodId, body.reportingPeriodId)
          )
        )
        .limit(1);
      console.log('Existing planning check completed, found:', existingPlanning.length, 'records');
    } catch (dbError) {
      console.error('Database error during existing planning check:', dbError);
      throw dbError;
    }

    if (existingPlanning.length > 0) {
      const existing = existingPlanning[0];
      const currentStatus = existing.approvalStatus || 'DRAFT';

      // Allow re-upload only if previous record is REJECTED or DRAFT
      if (!['REJECTED', 'DRAFT'].includes(currentStatus)) {
        return c.json(
          {
            success: false,
            errors: [`Cannot upload: Planning already exists with status '${currentStatus}'. Only DRAFT or REJECTED plans can be replaced.`],
            message: "Planning exists with non-editable status",
            existingPlanningId: existing.id,
            currentStatus: currentStatus
          },
          HttpStatusCodes.CONFLICT
        );
      }

      // If DRAFT or REJECTED, we'll allow the upload to replace it
      console.log(`Existing planning found with status '${currentStatus}' - will be replaced`);
    }

    // Parse the uploaded file
    console.log('Starting file parsing for:', body.fileName);
    let parseResult;
    try {
      parseResult = await fileParserService.parseFile(
        body.fileData,
        body.fileName,
        body.projectType,
        body.facilityType
      );
      console.log('File parsing completed, success:', parseResult.success);
    } catch (parseError) {
      console.error('Error during file parsing:', parseError);
      throw parseError;
    }

    if (!parseResult.success || !parseResult.data) {
      return c.json(
        {
          success: false,
          errors: parseResult.errors || ['File parsing failed'],
          message: 'Failed to parse file'
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Get the form schema for validation
    const formSchemaResults = await db
      .select()
      .from(formSchemas)
      .where(
        and(
          eq(formSchemas.projectType, body.projectType as any),
          eq(formSchemas.facilityType, body.facilityType as any),
          eq(formSchemas.moduleType, 'planning'),
          eq(formSchemas.isActive, true)
        )
      )
      .limit(1);

    const formSchema = formSchemaResults[0];

    if (!formSchema) {
      return c.json(
        {
          success: false,
          errors: ['Form schema not found for the specified project and facility type'],
          message: 'Schema not found'
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Normalize and validate the parsed data
    const normalizedFormData = normalizeFormData(parseResult.data);

    const validationResult = await validationService.validateFormData(
      formSchema.id,
      normalizedFormData
    );

    if (!validationResult.isValid) {
      return c.json(
        {
          success: false,
          errors: validationResult.errors?.map(e => e.message) || ['Validation failed'],
          message: 'Validation failed'
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Calculate computed values
    const computedValues = await calculateNestedComputedValues(normalizedFormData);

    let result;

    if (existingPlanning.length > 0) {
      // Update existing DRAFT or REJECTED record
      const existingId = existingPlanning[0].id;
      console.log(`Updating existing planning record ID: ${existingId}`);

      await db.update(schemaFormDataEntries)
        .set({
          schemaId: formSchema.id,
          formData: normalizedFormData,
          computedValues: computedValues,
          validationState: { isValid: true, lastValidated: new Date().toISOString() },
          metadata: {
            // Upload tracking
            uploadedAt: new Date().toISOString(),
            uploadedBy: userContext.userId,
            source: 'upload',
            fileName: body.fileName,

            // Creator identity tracking for audit purposes (for replacement)
            originalCreatedBy: existingPlanning[0].createdBy,
            replacedBy: userContext.userId,
            replacedAt: new Date().toISOString(),
            submissionSource: 'file_upload_replacement',
            // Generate unique identifier for resubmitted plan
            submissionId: `PLAN_${Date.now()}_${userContext.userId}_REPL`,
            // Timestamp for resubmitted plan
            resubmittedAt: new Date().toISOString(),

            // Replacement tracking
            previousStatus: existingPlanning[0].approvalStatus,
            isReplacement: true,

            // Parse results
            parseMetadata: parseResult.metadata,

            // Source file tracking for uploaded plans
            sourceFile: {
              originalName: body.fileName,
              uploadedAt: new Date().toISOString(),
              uploadedBy: userContext.userId,
              fileSize: body.fileData?.length || 0,
              contentType: body.fileName.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv',
              isReplacement: true,
              previousFileName: existingPlanning[0].sourceFileName
            },

            // Data summary
            dataSummary: {
              totalActivities: Object.keys(normalizedFormData.activities || {}).length,
              totalBudget: computedValues.totals?.annual_total || 0,
              hasErrors: (parseResult.errors?.length || 0) > 0,
              hasWarnings: (parseResult.warnings?.length || 0) > 0,
              errorCount: parseResult.errors?.length || 0,
              warningCount: parseResult.warnings?.length || 0
            },

            // System info
            userAgent: c.req.header('user-agent') || 'Unknown',
            ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'Unknown',

            // Processing info
            processingTime: Date.now(), // Will be updated after processing
            version: '1.0'
          },
          // Update source file tracking for uploaded plans
          sourceFileName: body.fileName,
          // Set approval status to PENDING for re-uploaded plans
          approvalStatus: 'PENDING',
          updatedBy: userContext.userId,
          updatedAt: new Date(),
        })
        .where(eq(schemaFormDataEntries.id, existingId));

      result = { id: existingId };
    } else {
      // Create new planning entry
      console.log('Creating new planning record');

      const [insertResult] = await db.insert(schemaFormDataEntries).values({
        schemaId: formSchema.id,
        entityType: 'planning',
        projectId: body.projectId,
        facilityId: validatedFacilityId,
        reportingPeriodId: body.reportingPeriodId,
        formData: normalizedFormData,
        computedValues: computedValues,
        validationState: { isValid: true, lastValidated: new Date().toISOString() },
        metadata: {
          // Upload tracking
          uploadedAt: new Date().toISOString(),
          uploadedBy: userContext.userId,
          source: 'upload',
          fileName: body.fileName,

          // Creator identity tracking for audit purposes
          createdBy: userContext.userId,
          createdAt: new Date().toISOString(),
          submissionSource: 'file_upload',
          // Generate unique identifier for submitted plan
          submissionId: `PLAN_${Date.now()}_${userContext.userId}`,
          // Timestamp for submitted plan
          submittedAt: new Date().toISOString(),

          // Creation tracking
          isReplacement: false,

          // Parse results
          parseMetadata: parseResult.metadata,

          // Source file tracking for uploaded plans
          sourceFile: {
            originalName: body.fileName,
            uploadedAt: new Date().toISOString(),
            uploadedBy: userContext.userId,
            fileSize: body.fileData?.length || 0,
            contentType: body.fileName.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv'
          },

          // Data summary
          dataSummary: {
            totalActivities: Object.keys(normalizedFormData.activities || {}).length,
            totalBudget: computedValues.totals?.annual_total || 0,
            hasErrors: (parseResult.errors?.length || 0) > 0,
            hasWarnings: (parseResult.warnings?.length || 0) > 0,
            errorCount: parseResult.errors?.length || 0,
            warningCount: parseResult.warnings?.length || 0
          },

          // System info
          userAgent: c.req.header('user-agent') || 'Unknown',
          ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'Unknown',

          // Processing info
          processingTime: Date.now(), // Will be updated after processing
          version: '1.0'
        },
        // Add source file tracking for uploaded plans
        sourceFileName: body.fileName,
        // Set approval status to PENDING for uploaded plans
        approvalStatus: 'PENDING',
        createdBy: userContext.userId,
        updatedBy: userContext.userId,
      }).returning();

      result = insertResult;
    }

    const created = await db.query.schemaFormDataEntries.findFirst({
      where: eq(schemaFormDataEntries.id, result.id),
      with: {
        schema: true,
        project: true,
        facility: true,
        reportingPeriod: true,
        creator: {
          columns: { id: true, name: true, email: true }
        },
        reviewer: {
          columns: { id: true, name: true, email: true }
        }
      },
    });

    // Send notification to admins about pending review
    try {
      const adminIds = await notificationService.getAdminUsersForNotification();
      if (adminIds.length > 0) {
        await notificationService.notifyPendingReview(result.id, adminIds);
      }
    } catch (notificationError) {
      console.error('Failed to send pending review notification:', notificationError);
      // Don't fail the upload if notification fails
    }

    // Transform warnings and errors into structured format
    const structuredWarnings = (parseResult.warnings || []).map((warning, index) => {
      const rowMatch = warning.match(/Row (\d+)/);
      return {
        id: index + 1,
        row: rowMatch ? parseInt(rowMatch[1]) : null,
        type: 'warning',
        message: warning,
        category: categorizeMessage(warning)
      };
    });

    const structuredErrors = (parseResult.errors || []).map((error, index) => {
      const rowMatch = error.match(/Row (\d+)/);
      return {
        id: index + 1,
        row: rowMatch ? parseInt(rowMatch[1]) : null,
        type: 'error',
        message: error,
        category: categorizeMessage(error)
      };
    });

    return c.json(
      {
        success: true,
        message: existingPlanning.length > 0
          ? 'Planning data updated successfully'
          : 'Planning data uploaded successfully',
        planningId: created?.id,

        // Enhanced statistics
        stats: {
          rowsParsed: parseResult.metadata?.rowCount || 0,
          validRows: parseResult.metadata?.validRows || 0,
          invalidRows: parseResult.metadata?.invalidRows || 0,
          activitiesProcessed: Object.keys(normalizedFormData.activities || {}).length,
          totalBudget: computedValues.totals?.annual_total || 0,

          // Structured issues
          warnings: structuredWarnings,
          errors: structuredErrors,

          // Summary counts
          warningCount: structuredWarnings.length,
          errorCount: structuredErrors.length,

          // Quality indicators
          hasIssues: structuredWarnings.length > 0 || structuredErrors.length > 0,
          dataQuality: calculateDataQuality(parseResult, computedValues)
        },

        // Essential record information
        record: {
          id: created?.id,
          facilityId: created?.facilityId,
          projectId: created?.projectId,
          reportingPeriodId: created?.reportingPeriodId,
          approvalStatus: created?.approvalStatus || 'PENDING',
          createdAt: created?.createdAt,
          updatedAt: created?.updatedAt,

          // Operation context
          operation: existingPlanning.length > 0 ? 'update' : 'create',
          previousStatus: existingPlanning.length > 0 ? existingPlanning[0].approvalStatus : null,

          // Related entities
          facility: created?.facility ? {
            id: created.facility.id,
            name: created.facility.name,
            facilityType: created.facility.facilityType
          } : null,
          project: created?.project ? {
            id: created.project.id,
            name: created.project.name,
            projectType: created.project.projectType
          } : null,
          reportingPeriod: created?.reportingPeriod ? {
            id: created.reportingPeriod.id,
            year: created.reportingPeriod.year,
            startDate: created.reportingPeriod.startDate,
            endDate: created.reportingPeriod.endDate
          } : null
        },

        // Processing metadata
        processing: {
          fileName: body.fileName,
          uploadedAt: new Date().toISOString(),
          uploadedBy: userContext.userId,
          processingTimeMs: Date.now() - (computedValues.metadata?.processingTime || Date.now()),
          version: '1.0'
        }
      },
      HttpStatusCodes.CREATED
    );
  } catch (error: any) {
    console.error('Upload file error:', error);

    if (error.message === "Unauthorized") {
      return c.json(
        { success: false, errors: ["Authentication required"], message: "Unauthorized" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    return c.json(
      {
        success: false,
        message: 'Upload failed',
        planningId: null,

        stats: {
          rowsParsed: 0,
          validRows: 0,
          invalidRows: 0,
          activitiesProcessed: 0,
          totalBudget: 0,
          warnings: [],
          errors: [{
            id: 1,
            row: null,
            type: 'error',
            message: error.message || 'Failed to upload file',
            category: 'system_error'
          }],
          warningCount: 0,
          errorCount: 1,
          hasIssues: true,
          dataQuality: { score: 0, grade: 'F', issues: ['System error occurred'] }
        },

        record: null,

        processing: {
          fileName: 'unknown',
          uploadedAt: new Date().toISOString(),
          uploadedBy: null,
          processingTimeMs: 0,
          version: '1.0'
        }
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

// DOWNLOAD TEMPLATE HANDLER
export const downloadTemplate: AppRouteHandler<DownloadTemplateRoute> = async (c) => {
  try {
    const { projectType, facilityType, format } = c.req.query();

    // Fetch activities for the template with category information and metadata
    const activities = await db
      .select({
        id: dynamicActivities.id,
        name: dynamicActivities.name,
        code: dynamicActivities.code,
        categoryName: schemaActivityCategories.name,
        categoryCode: schemaActivityCategories.code,
        metadata: dynamicActivities.metadata,
      })
      .from(dynamicActivities)
      .innerJoin(
        schemaActivityCategories,
        eq(dynamicActivities.categoryId, schemaActivityCategories.id)
      )
      .where(
        and(
          eq(dynamicActivities.projectType, projectType as any),
          eq(dynamicActivities.facilityType, facilityType as any),
          eq(dynamicActivities.moduleType, 'planning'),
          eq(dynamicActivities.isActive, true),
          eq(schemaActivityCategories.isActive, true)
        )
      )
      .orderBy(schemaActivityCategories.displayOrder, dynamicActivities.displayOrder);

    if (activities.length === 0) {
      return c.json(
        { message: "No activities found for the specified configuration" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    // Filter out activities with null codes and provide defaults
    const validActivities = activities.map(activity => ({
      ...activity,
      code: activity.code || `ACT_${activity.id}`
    }));

    const templateBuffer = fileParserService.generateTemplate(validActivities, format as 'csv' | 'xlsx');

    const fileName = `planning_template_${projectType}_${facilityType}.${format}`;
    const contentType = format === 'csv'
      ? 'text/csv'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    return new Response(templateBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (error: any) {
    console.error('Download template error:', error);
    return c.json(
      { message: "Failed to generate template" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

// SUBMIT FOR APPROVAL HANDLER
export const submitForApproval: AppRouteHandler<SubmitForApprovalRoute> = async (c) => {
  try {
    const userContext = await getUserContext(c);
    const body = await c.req.json();

    // Fetch the planning entries
    const planningEntries = await db.query.schemaFormDataEntries.findMany({
      where: and(
        inArray(schemaFormDataEntries.id, body.planningIds),
        eq(schemaFormDataEntries.entityType, 'planning')
      ),
    });

    if (planningEntries.length === 0) {
      return c.json(
        {
          success: false,
          message: "No planning entries found",
          updatedCount: 0
        },
        HttpStatusCodes.NOT_FOUND
      );
    }

    // Validate user has access to all facilities
    for (const entry of planningEntries) {
      if (!userContext.accessibleFacilityIds.includes(entry.facilityId)) {
        return c.json(
          {
            success: false,
            message: "Access denied: you don't have access to all specified facilities",
            updatedCount: 0
          },
          HttpStatusCodes.FORBIDDEN
        );
      }
    }

    // Check that all entries are in DRAFT or REJECTED status
    const invalidStatuses = planningEntries.filter(
      e => !['DRAFT', 'REJECTED'].includes(e.approvalStatus || 'DRAFT')
    );

    if (invalidStatuses.length > 0) {
      return c.json(
        {
          success: false,
          message: "Some plans are already submitted or approved and cannot be resubmitted",
          updatedCount: 0
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Update all entries to PENDING
    await db.update(schemaFormDataEntries)
      .set({
        approvalStatus: 'PENDING',
        updatedBy: userContext.userId,
        updatedAt: new Date(),
        metadata: sql`
          jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{submittedForApproval}',
            jsonb_build_object(
              'submittedAt', to_jsonb(NOW()),
              'submittedBy', ${userContext.userId},
              'comments', ${body.comments ? sql`${body.comments}` : sql`NULL`}
            )
          )
        `
      })
      .where(inArray(schemaFormDataEntries.id, body.planningIds));

    // Send notifications to admins about pending reviews
    try {
      const adminIds = await notificationService.getAdminUsersForNotification();
      if (adminIds.length > 0) {
        // Send notification for each plan submitted
        for (const planningId of body.planningIds) {
          await notificationService.notifyPendingReview(planningId, adminIds);
        }
      }
    } catch (notificationError) {
      console.error('Failed to send pending review notifications:', notificationError);
      // Don't fail the submission if notification fails
    }

    return c.json({
      success: true,
      message: `${planningEntries.length} plan(s) submitted for approval`,
      updatedCount: planningEntries.length
    });
  } catch (error: any) {
    console.error('Submit for approval error:', error);
    return c.json(
      {
        success: false,
        message: "Failed to submit for approval",
        updatedCount: 0
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

// NEW DEDICATED APPROVAL ENDPOINT HANDLER
export const approvePlanning: AppRouteHandler<ApprovePlanningRoute> = async (c) => {
  const logger = c.get('logger');
  
  try {
    const userContext = await getUserContext(c);
    const body = await c.req.json();

    // Validate input using ApprovalError
    if (!body.planningId || !body.action) {
      const error = new ApprovalError(
        'INVALID_APPROVAL_ACTION',
        'planningId and action are required',
        HttpStatusCodes.BAD_REQUEST,
        {
          code: 'INVALID_APPROVAL_ACTION',
          reason: 'Missing required fields: planningId and action'
        }
      );
      
      logger?.warn({
        error: error.toJSON(),
        requestBody: body
      }, 'Invalid approval request: missing required fields');
      
      return c.json(error.toJSON(), error.statusCode as any);
    }

    if (!['APPROVE', 'REJECT'].includes(body.action)) {
      const error = ApprovalErrorFactory.invalidApprovalAction(body.action);
      
      logger?.warn({
        error: error.toJSON(),
        requestBody: body
      }, 'Invalid approval action provided');
      
      return c.json(error.toJSON(), error.statusCode as any);
    }

    // Check if user has approval permissions
    const canApprove = hasAdminAccess(userContext.role, userContext.permissions) ||
      userContext.permissions?.includes('approve_planning');

    if (!canApprove) {
      const error = ApprovalErrorFactory.insufficientPermissions(
        userContext.userId,
        userContext.role,
        ['admin', 'superadmin']
      );
      
      logger?.warn({
        error: error.toJSON(),
        userId: userContext.userId,
        userRole: userContext.role
      }, 'User lacks approval permissions');
      
      return c.json(error.toJSON(), error.statusCode as any);
    }

    // Validate comments are required for rejection
    if (body.action === 'REJECT' && (!body.comments || body.comments.trim().length === 0)) {
      const error = ApprovalErrorFactory.commentsRequired(body.planningId, 'REJECT');
      
      logger?.warn({
        error: error.toJSON(),
        planningId: body.planningId,
        action: body.action
      }, 'Comments required for rejection');
      
      return c.json(error.toJSON(), error.statusCode as any);
    }

    // Log approval attempt for audit purposes
    logger?.info({
      planningId: body.planningId,
      action: body.action,
      userId: userContext.userId,
      userRole: userContext.role,
      hasComments: !!body.comments
    }, 'Processing approval request');

    // Use approval service to process the request
    let result;
    if (body.action === 'APPROVE') {
      result = await approvalService.approvePlan(
        body.planningId,
        userContext.userId,
        body.comments
      );
    } else {
      result = await approvalService.rejectPlan(
        body.planningId,
        userContext.userId,
        body.comments || ''
      );
    }

    // Log the approval action to audit trail with budget metadata
    try {
      // Fetch the plan to calculate budget
      const plan = await db.query.schemaFormDataEntries.findFirst({
        where: eq(schemaFormDataEntries.id, body.planningId)
      });

      const budgetAmount = plan ? calculatePlanBudget(plan.formData) : 0;
      const previousStatus = result.success ? 'PENDING' : 'UNKNOWN';
      const newStatus = body.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      
      await auditService.logApprovalAction(
        body.planningId,
        previousStatus as any,
        newStatus as any,
        userContext.userId,
        body.comments,
        { budgetAmount }
      );
      
      logger?.info({
        planningId: body.planningId,
        action: body.action,
        previousStatus,
        newStatus,
        userId: userContext.userId,
        budgetAmount
      }, 'Audit log created for approval action with budget metadata');
      
    } catch (auditError) {
      logger?.error({
        planningId: body.planningId,
        action: body.action,
        auditError: auditError instanceof Error ? auditError.message : 'Unknown error'
      }, 'Failed to log audit action');
      // Don't fail the request if audit logging fails
    }

    // Log successful approval
    logger?.info({
      planningId: body.planningId,
      action: body.action,
      success: result.success,
      newStatus: result.record.approvalStatus
    }, 'Approval request processed successfully');

    return c.json(result, HttpStatusCodes.OK);

  } catch (error: any) {
    // Handle ApprovalError specifically
    if (isApprovalError(error)) {
      logger?.error({
        error: error.toJSON(),
        planningId: error.planningId
      }, 'Approval request failed with ApprovalError');
      
      return c.json(error.toJSON(), error.statusCode as any);
    }

    // Handle unexpected errors
    logger?.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      requestBody: await c.req.json().catch(() => ({}))
    }, 'Unexpected error in approval endpoint');

    const validationError = ApprovalErrorFactory.validationError(
      `Failed to process approval request: ${error instanceof Error ? error.message : 'Unknown error'}`
    );

    return c.json(validationError.toJSON(), validationError.statusCode as any);
  }
};

// REVIEW PLANNING HANDLER (Approve/Reject)
export const reviewPlanning: AppRouteHandler<ReviewPlanningRoute> = async (c) => {
  try {
    const userContext = await getUserContext(c);
    const body = await c.req.json();

    // Check if user has planner/admin permissions
    const canReview = hasAdminAccess(userContext.role, userContext.permissions) ||
      userContext.permissions?.includes('approve_planning');

    if (!canReview) {
      return c.json(
        {
          success: false,
          message: "Insufficient permissions to review planning"
        },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Fetch the planning entry
    const planning = await db.query.schemaFormDataEntries.findFirst({
      where: and(
        eq(schemaFormDataEntries.id, body.planningId),
        eq(schemaFormDataEntries.entityType, 'planning')
      ),
    });

    if (!planning) {
      return c.json(
        {
          success: false,
          message: "Planning not found"
        },
        HttpStatusCodes.NOT_FOUND
      );
    }

    // Check if planning is in PENDING status
    if (planning.approvalStatus !== 'PENDING') {
      return c.json(
        {
          success: false,
          message: `Planning is in ${planning.approvalStatus} status and cannot be reviewed`
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Calculate budget amount before status change
    const budgetAmount = calculatePlanBudget(planning.formData);

    // Update approval status
    const newStatus = body.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    await db.update(schemaFormDataEntries)
      .set({
        approvalStatus: newStatus,
        reviewedBy: userContext.userId,
        reviewedAt: new Date(),
        reviewComments: body.comments || null,
        updatedBy: userContext.userId,
        updatedAt: new Date(),
      })
      .where(eq(schemaFormDataEntries.id, body.planningId));

    // Log to audit with budget metadata
    try {
      await auditService.logApprovalAction(
        body.planningId,
        planning.approvalStatus,
        newStatus as any,
        userContext.userId,
        body.comments,
        { budgetAmount }
      );
    } catch (auditError) {
      console.error('Failed to log audit action:', auditError);
      // Don't fail the request if audit logging fails
    }

    const updated = await db.query.schemaFormDataEntries.findFirst({
      where: eq(schemaFormDataEntries.id, body.planningId),
      with: {
        schema: true,
        project: true,
        facility: true,
        reportingPeriod: true,
        creator: {
          columns: { id: true, name: true, email: true }
        },
        reviewer: {
          columns: { id: true, name: true, email: true }
        }
      },
    });

    return c.json({
      success: true,
      message: `Planning ${newStatus.toLowerCase()} successfully`,
      data: updated
    });
  } catch (error: any) {
    console.error('Review planning error:', error);
    return c.json(
      {
        success: false,
        message: "Failed to review planning"
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

// ENHANCED BULK REVIEW HANDLER
export const bulkReviewPlanning: AppRouteHandler<BulkReviewPlanningRoute> = async (c) => {
  try {
    const userContext = await getUserContext(c);
    const body = await c.req.json();

    // Enhanced input validation
    if (!body.planningIds || !Array.isArray(body.planningIds) || body.planningIds.length === 0) {
      return c.json(
        {
          success: false,
          message: "planningIds must be a non-empty array",
          updatedCount: 0,
          results: []
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    if (!['APPROVE', 'REJECT'].includes(body.action)) {
      return c.json(
        {
          success: false,
          message: "action must be either 'APPROVE' or 'REJECT'",
          updatedCount: 0,
          results: []
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Validate comments are required for rejection
    if (body.action === 'REJECT' && (!body.comments || body.comments.trim().length === 0)) {
      return c.json(
        {
          success: false,
          message: "Comments are required when rejecting plans",
          updatedCount: 0,
          results: []
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Check permissions
    const canReview = hasAdminAccess(userContext.role, userContext.permissions) ||
      userContext.permissions?.includes('approve_planning');

    if (!canReview) {
      return c.json(
        {
          success: false,
          message: "Insufficient permissions to approve/reject planning",
          updatedCount: 0,
          results: []
        },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Pre-validate all plans before processing any
    const planningEntries = await db.query.schemaFormDataEntries.findMany({
      where: and(
        inArray(schemaFormDataEntries.id, body.planningIds),
        eq(schemaFormDataEntries.entityType, 'planning')
      ),
    });

    // Check for missing plans
    const foundIds = planningEntries.map(p => p.id);
    const missingIds = body.planningIds.filter((id: number) => !foundIds.includes(id));
    
    if (missingIds.length > 0) {
      return c.json(
        {
          success: false,
          message: `Plans not found: ${missingIds.join(', ')}`,
          updatedCount: 0,
          results: missingIds.map((id: number) => ({ planningId: id, success: false, error: 'Not found' }))
        },
        HttpStatusCodes.NOT_FOUND
      );
    }

    // Check for plans not in PENDING status
    const invalidStatusPlans = planningEntries.filter(p => p.approvalStatus !== 'PENDING');
    
    if (invalidStatusPlans.length > 0) {
      return c.json(
        {
          success: false,
          message: `Some plans cannot be reviewed due to invalid status`,
          updatedCount: 0,
          results: invalidStatusPlans.map((p: any) => ({
            planningId: p.id,
            success: false,
            error: `Cannot review ${p.approvalStatus} plan`
          }))
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Process all plans using approval service with transaction rollback
    const results: Array<{ planningId: number; success: boolean; error?: string }> = [];
    let updatedCount = 0;
    const successfulUpdates: number[] = [];

    try {
      // Use database transaction for atomic operations
      await db.transaction(async () => {
        for (const planningId of body.planningIds) {
          try {
            let result;
            if (body.action === 'APPROVE') {
              result = await approvalService.approvePlan(
                planningId,
                userContext.userId,
                body.comments
              );
            } else {
              result = await approvalService.rejectPlan(
                planningId,
                userContext.userId,
                body.comments || ''
              );
            }

            if (result.success) {
              // Log audit action with budget metadata
              try {
                // Fetch the plan to calculate budget
                const plan = await db.query.schemaFormDataEntries.findFirst({
                  where: eq(schemaFormDataEntries.id, planningId)
                });

                const budgetAmount = plan ? calculatePlanBudget(plan.formData) : 0;

                await auditService.logApprovalAction(
                  planningId,
                  'PENDING' as any,
                  (body.action === 'APPROVE' ? 'APPROVED' : 'REJECTED') as any,
                  userContext.userId,
                  body.comments,
                  { budgetAmount }
                );
              } catch (auditError) {
                console.error('Failed to log audit action for bulk operation:', auditError);
                // Don't fail the transaction for audit logging errors
              }

              results.push({ planningId, success: true });
              successfulUpdates.push(planningId);
              updatedCount++;
            } else {
              results.push({ planningId, success: false, error: result.message });
              // If any operation fails, rollback the transaction
              throw new Error(`Failed to process plan ${planningId}: ${result.message}`);
            }
          } catch (error: any) {
            results.push({ planningId, success: false, error: error.message });
            throw error; // Rollback transaction
          }
        }
      });

      return c.json({
        success: true,
        message: `${updatedCount} plan(s) ${body.action.toLowerCase()}d successfully`,
        updatedCount,
        results
      });

    } catch (transactionError: any) {
      console.error('Bulk review transaction failed:', transactionError);
      
      // Return partial results with rollback information
      return c.json(
        {
          success: false,
          message: "Bulk operation failed and was rolled back",
          updatedCount: 0,
          results: body.planningIds.map((id: number) => ({
            planningId: id,
            success: false,
            error: "Transaction rolled back due to failure"
          }))
        },
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }

  } catch (error: any) {
    console.error('Bulk review error:', error);
    return c.json(
      {
        success: false,
        message: "Failed to process bulk review request",
        updatedCount: 0,
        results: []
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

// GET APPROVAL HISTORY
export const getApprovalHistory: AppRouteHandler<GetApprovalHistoryRoute> = async (c) => {
  try {
    const { id } = c.req.param();
    const planningId = parseInt(id);

    const planning = await db.query.schemaFormDataEntries.findFirst({
      where: and(
        eq(schemaFormDataEntries.id, planningId),
        eq(schemaFormDataEntries.entityType, 'planning')
      ),
      with: {
        schema: true,
        project: true,
        facility: true,
        reportingPeriod: true,
        creator: {
          columns: { id: true, name: true, email: true }
        }
      },
    });

    if (!planning) {
      return c.json(
        { message: "Planning not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    // Build history from metadata and current state
    const history: any[] = [];

    // Add submission history from metadata if exists
    const metadata = planning.metadata as any;
    if (metadata?.submittedForApproval) {
      history.push({
        status: 'PENDING',
        reviewedBy: null,
        reviewedAt: metadata.submittedForApproval.submittedAt,
        comments: metadata.submittedForApproval.comments || null
      });
    }

    // Add current review state if reviewed
    if (planning.reviewedBy && planning.reviewedAt) {
      // Fetch reviewer details
      let reviewerName = 'Unknown Reviewer';
      try {
        const reviewer = await db.query.users.findFirst({
          where: eq(users.id, planning.reviewedBy),
          columns: { name: true }
        });
        if (reviewer) {
          reviewerName = reviewer.name;
        }
      } catch (reviewerError) {
        console.error('Failed to fetch reviewer details:', reviewerError);
      }

      history.push({
        status: planning.approvalStatus,
        reviewedBy: { 
          id: planning.reviewedBy, 
          name: reviewerName 
        },
        reviewedAt: planning.reviewedAt.toISOString(),
        comments: planning.reviewComments
      });
    }

    return c.json({
      planningId: planning.id,
      currentStatus: planning.approvalStatus || 'DRAFT',
      history
    });
  } catch (error: any) {
    console.error('Get approval history error:', error);
    return c.json(
      { message: "Failed to fetch approval history" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

// Helper function (reuse from existing handlers)
function normalizeFormData(formData: any) {
  const normalized = { ...formData };

  if (normalized.activities) {
    for (const [_activityId, activityData] of Object.entries(normalized.activities)) {
      const activity = activityData as any;

      // Respect applicable_quarters if provided in formData
      const applicableQuarters: string[] = Array.isArray(activity.applicable_quarters)
        ? activity.applicable_quarters
        : ['Q1', 'Q2', 'Q3', 'Q4'];

      const unitCost = parseFloat(activity.unit_cost) || 0;
      const frequency = parseFloat(activity.frequency) || 1;
      const q1CountRaw = parseFloat(activity.q1_count) || 0;
      const q2CountRaw = parseFloat(activity.q2_count) || 0;
      const q3CountRaw = parseFloat(activity.q3_count) || 0;
      const q4CountRaw = parseFloat(activity.q4_count) || 0;

      // Zero non-applicable counts before amount calculation
      const q1Count = applicableQuarters.includes('Q1') ? q1CountRaw : 0;
      const q2Count = applicableQuarters.includes('Q2') ? q2CountRaw : 0;
      const q3Count = applicableQuarters.includes('Q3') ? q3CountRaw : 0;
      const q4Count = applicableQuarters.includes('Q4') ? q4CountRaw : 0;

      activity.q1_amount = frequency * unitCost * q1Count;
      activity.q2_amount = frequency * unitCost * q2Count;
      activity.q3_amount = frequency * unitCost * q3Count;
      activity.q4_amount = frequency * unitCost * q4Count;
      activity.total_budget = activity.q1_amount + activity.q2_amount + activity.q3_amount + activity.q4_amount;
    }
  }

  return normalized;
}

/**
 * Categorize error/warning messages for better frontend handling
 */
function categorizeMessage(message: string): string {
  if (message.includes('Could not match activity')) return 'activity_matching';
  if (message.includes('cannot be negative')) return 'validation';
  if (message.includes('Empty value')) return 'data_quality';
  if (message.includes('Category mismatch')) return 'category_validation';
  if (message.includes('Zero budget')) return 'budget_warning';
  if (message.includes('High frequency') || message.includes('High unit cost')) return 'value_warning';
  if (message.includes('Uneven quarterly distribution')) return 'distribution_warning';
  if (message.includes('Activity matched by')) return 'matching_info';
  return 'general';
}

/**
 * Calculate overall data quality score
 */
function calculateDataQuality(parseResult: any, computedValues: any): {
  score: number;
  grade: string;
  issues: string[];
} {
  let score = 100;
  const issues: string[] = [];

  // Deduct points for errors and warnings
  const errorCount = parseResult.errors?.length || 0;
  const warningCount = parseResult.warnings?.length || 0;

  score -= errorCount * 10; // 10 points per error
  score -= warningCount * 2; // 2 points per warning

  // Check data completeness
  const totalActivities = Object.keys(computedValues.activities || {}).length;
  const activitiesWithBudget = Object.values(computedValues.activities || {})
    .filter((activity: any) => activity.total_budget > 0).length;

  const completenessRatio = totalActivities > 0 ? activitiesWithBudget / totalActivities : 0;
  if (completenessRatio < 0.8) {
    score -= 15;
    issues.push('Low budget completeness');
  }

  // Check for data consistency
  const totalBudget = computedValues.totals?.annual_total || 0;
  if (totalBudget === 0) {
    score -= 20;
    issues.push('No budget allocated');
  }

  // Ensure score is between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Determine grade
  let grade = 'F';
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';

  return { score, grade, issues };
}
