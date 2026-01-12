import { eq, and, desc, inArray, or } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { db } from "@/db";
import { financialReports, users } from "@/db/schema";
import type { AppRouteHandler } from "@/api/lib/types";
import type {
  GetDafQueueRoute,
  GetDgQueueRoute,
} from "./financial-reports.routes";
import { FacilityHierarchyService } from "../../services/facility-hierarchy.service";
import { getUserContext } from "@/lib/utils/get-user-facility";

/**
 * Handler for retrieving DAF approval queue
 * Requirements: 6.1-6.4, 3.1, 3.2
 * 
 * Filters reports by:
 * - Status: pending_daf_approval
 * - Accessible facilities based on user's hierarchy
 * 
 * Includes:
 * - Facility name, type
 * - Submitter details
 * - Ordered by submission date (oldest first)
 * - Pagination support
 */
export const getDafQueue: AppRouteHandler<GetDafQueueRoute> = async (c) => {
  try {
    // Get user context
    const userContext = await getUserContext(c);
    const userId = userContext.userId;

    // Verify user has DAF role
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return c.json(
        { message: "User not found" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    if (user.role !== 'daf') {
      return c.json(
        { message: "Access denied: DAF role required" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Get accessible facility IDs based on hierarchy
    const accessibleFacilityIds = await FacilityHierarchyService.getAccessibleFacilityIds(userId);

    if (accessibleFacilityIds.length === 0) {
      return c.json({
        reports: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      }, HttpStatusCodes.OK);
    }

    // Parse pagination and filter parameters
    const query = c.req.query();
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const offset = (page - 1) * limit;
    const statusFilter = query.status || 'pending';

    // Determine status filter based on query parameter
    let statusConditions;
    if (statusFilter === 'pending') {
      statusConditions = eq(financialReports.status, 'pending_daf_approval');
    } else if (statusFilter === 'approved') {
      statusConditions = eq(financialReports.status, 'approved_by_daf');
    } else if (statusFilter === 'rejected') {
      statusConditions = eq(financialReports.status, 'rejected_by_daf');
    } else {
      // 'all' - include all statuses related to DAF workflow
      statusConditions = or(
        eq(financialReports.status, 'pending_daf_approval'),
        eq(financialReports.status, 'approved_by_daf'),
        eq(financialReports.status, 'rejected_by_daf')
      );
    }

    // Build query conditions
    const conditions = [
      statusConditions,
      inArray(financialReports.facilityId, accessibleFacilityIds),
    ];

    // Fetch reports with relations
    const [reports, totalCount] = await Promise.all([
      db.query.financialReports.findMany({
        where: and(...conditions),
        orderBy: [desc(financialReports.submittedAt)], // Oldest first
        limit,
        offset,
        with: {
          project: true,
          facility: {
            with: {
              district: true,
            },
          },
          reportingPeriod: true,
          creator: true,
          submitter: true,
        },
      }),
      db.$count(financialReports, and(...conditions)),
    ]);

    return c.json({
      reports,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    }, HttpStatusCodes.OK);

  } catch (error: any) {
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

    console.error('Error fetching DAF queue:', error);
    return c.json(
      { message: "Failed to fetch DAF approval queue", error: error.message },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Handler for retrieving DG approval queue
 * Requirements: 6.1-6.4, 3.1, 3.2
 * 
 * Filters reports by:
 * - Status: approved_by_daf
 * - Accessible facilities based on user's hierarchy
 * 
 * Includes:
 * - Facility name, type
 * - Submitter details
 * - DAF approval details
 * - Ordered by DAF approval date (oldest first)
 * - Pagination support
 */
export const getDgQueue: AppRouteHandler<GetDgQueueRoute> = async (c) => {
  try {
    // Get user context
    const userContext = await getUserContext(c);
    const userId = userContext.userId;

    // Verify user has DG role
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return c.json(
        { message: "User not found" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    if (user.role !== 'dg') {
      return c.json(
        { message: "Access denied: DG role required" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Get accessible facility IDs based on hierarchy
    const accessibleFacilityIds = await FacilityHierarchyService.getAccessibleFacilityIds(userId);

    if (accessibleFacilityIds.length === 0) {
      return c.json({
        reports: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      }, HttpStatusCodes.OK);
    }

    // Parse pagination and filter parameters
    const query = c.req.query();
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const offset = (page - 1) * limit;
    const statusFilter = query.status || 'pending';

    // Determine status filter based on query parameter
    let statusConditions;
    if (statusFilter === 'pending') {
      statusConditions = eq(financialReports.status, 'approved_by_daf');
    } else if (statusFilter === 'approved') {
      statusConditions = eq(financialReports.status, 'fully_approved');
    } else if (statusFilter === 'rejected') {
      statusConditions = eq(financialReports.status, 'rejected_by_dg');
    } else {
      // 'all' - include all statuses related to DG workflow
      statusConditions = or(
        eq(financialReports.status, 'approved_by_daf'),
        eq(financialReports.status, 'fully_approved'),
        eq(financialReports.status, 'rejected_by_dg')
      );
    }

    // Build query conditions
    const conditions = [
      statusConditions,
      inArray(financialReports.facilityId, accessibleFacilityIds),
    ];

    // Fetch reports with relations
    const [reports, totalCount] = await Promise.all([
      db.query.financialReports.findMany({
        where: and(...conditions),
        orderBy: [desc(financialReports.dafApprovedAt)], // Oldest first by DAF approval date
        limit,
        offset,
        with: {
          project: true,
          facility: {
            with: {
              district: true,
            },
          },
          reportingPeriod: true,
          creator: true,
          submitter: true,
          dafApprover: true, // Include DAF approver details
        },
      }),
      db.$count(financialReports, and(...conditions)),
    ]);

    return c.json({
      reports,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    }, HttpStatusCodes.OK);

  } catch (error: any) {
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

    console.error('Error fetching DG queue:', error);
    return c.json(
      { message: "Failed to fetch DG approval queue", error: error.message },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};
