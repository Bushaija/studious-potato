import { eq, asc, and, notInArray, inArray, sql, lte, gte, or } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/api/lib/types";
import { db } from "@/api/db";
import { facilities, schemaFormDataEntries, projects, reportingPeriods, districts } from "@/api/db/schema";
import { getCurrentFiscalQuarter } from "@/lib/utils";
import { validateReportingPeriod } from "./reporting-period-validation";
import type { ListRoute, GetOneRoute, GetByNameRoute, GetByDistrictRoute, GetPlannedRoute, GetExecutionRoute, GetAllRoute, GetAccessibleRoute, GetHierarchyRoute } from "./facilities.routes";

// Helper function to get active reporting period
async function getActiveReportingPeriod() {
    const currentDate = new Date().toISOString().split('T')[0];

    const activePeriod = await db.query.reportingPeriods.findFirst({
        where: and(
            eq(reportingPeriods.status, 'ACTIVE'),
            lte(reportingPeriods.startDate, currentDate),
            gte(reportingPeriods.endDate, currentDate)
        ),
    });

    return activePeriod;
}

// Types for execution status analysis
interface FacilityExecutionStatus {
    facilityId: number;
    facilityName: string;
    executedQuarters: string[];
    availableQuarters: string[];
}

// Function to analyze execution status for facilities within a reporting period
async function analyzeExecutionStatus(
    program: string,
    facilityType: string,
    facilityId: number,
    reportingPeriodId: number,
    plannedFacilityIds: number[]
): Promise<FacilityExecutionStatus[]> {
    if (plannedFacilityIds.length === 0) {
        return [];
    }

    // Query all execution data for facilities within the reporting period
    const executionData = await db
        .select({
            facilityId: schemaFormDataEntries.facilityId,
            facilityName: facilities.name,
            quarter: sql<string>`${schemaFormDataEntries.formData}->>'quarter'`.as('quarter'),
        })
        .from(schemaFormDataEntries)
        .innerJoin(
            projects,
            eq(schemaFormDataEntries.projectId, projects.id)
        )
        .innerJoin(
            facilities,
            eq(schemaFormDataEntries.facilityId, facilities.id)
        )
        .where(
            and(
                eq(schemaFormDataEntries.entityType, "execution"),
                eq(projects.projectType, program as "HIV" | "Malaria" | "TB"),
                eq(facilities.facilityType, facilityType as "hospital" | "health_center"),
                or(
                    eq(facilities.id, facilityId),
                    eq(facilities.parentFacilityId, facilityId)
                ),
                eq(schemaFormDataEntries.reportingPeriodId, reportingPeriodId),
                inArray(schemaFormDataEntries.facilityId, plannedFacilityIds)
            )
        );

    // Get facility names for all planned facilities
    const facilityNames = await db
        .select({
            id: facilities.id,
            name: facilities.name,
        })
        .from(facilities)
        .where(inArray(facilities.id, plannedFacilityIds));

    const facilityNameMap = new Map(facilityNames.map(f => [f.id, f.name]));

    // Group execution data by facility and extract executed quarters
    const facilityExecutionMap = new Map<number, Set<string>>();

    for (const execution of executionData) {
        if (!facilityExecutionMap.has(execution.facilityId)) {
            facilityExecutionMap.set(execution.facilityId, new Set());
        }
        if (execution.quarter && typeof execution.quarter === 'string') {
            facilityExecutionMap.get(execution.facilityId)!.add(execution.quarter);
        }
    }

    // Calculate available quarters for each facility (Q1-Q4 minus executed quarters)
    const allQuarters = ["Q1", "Q2", "Q3", "Q4"];
    const facilityStatuses: FacilityExecutionStatus[] = [];

    for (const facilityId of plannedFacilityIds) {
        const executedQuarters = Array.from(facilityExecutionMap.get(facilityId) || new Set()) as string[];
        const availableQuarters = allQuarters.filter(quarter => !executedQuarters.includes(quarter));

        // Only include facilities that have available quarters
        if (availableQuarters.length > 0) {
            facilityStatuses.push({
                facilityId,
                facilityName: facilityNameMap.get(facilityId) || `Facility ${facilityId}`,
                executedQuarters,
                availableQuarters,
            });
        }
    }

    return facilityStatuses;
}

// Function to get facilities executed for a specific quarter within a reporting period
async function getExecutedFacilitiesForQuarter(
    program: string,
    facilityType: string,
    facilityId: number,
    reportingPeriodId: number,
    quarter: string
): Promise<number[]> {
    console.log(`[getExecutedFacilitiesForQuarter] Checking for quarter: ${quarter}, reportingPeriodId: ${reportingPeriodId}`);
    
    const executedFacilityIds = await db
        .selectDistinct({
            facilityId: schemaFormDataEntries.facilityId,
            quarter: sql<string>`${schemaFormDataEntries.formData}->>'quarter'`.as('quarter'),
        })
        .from(schemaFormDataEntries)
        .innerJoin(
            projects,
            eq(schemaFormDataEntries.projectId, projects.id)
        )
        .innerJoin(
            facilities,
            eq(schemaFormDataEntries.facilityId, facilities.id)
        )
        .where(
            and(
                eq(schemaFormDataEntries.entityType, "execution"),
                eq(projects.projectType, program as "HIV" | "Malaria" | "TB"),
                eq(facilities.facilityType, facilityType as "hospital" | "health_center"),
                or(
                    eq(facilities.id, facilityId),
                    eq(facilities.parentFacilityId, facilityId)
                ),
                eq(schemaFormDataEntries.reportingPeriodId, reportingPeriodId),
                // Quarter-specific filtering using form_data JSON query (not metadata)
                sql`${schemaFormDataEntries.formData}->>'quarter' = ${quarter}`
            )
        );

    console.log(`[getExecutedFacilitiesForQuarter] Found executed facilities:`, executedFacilityIds);
    
    return executedFacilityIds.map(f => f.facilityId);
}

export const getByDistrict: AppRouteHandler<GetByDistrictRoute> = async (c) => {
    const { districtId } = c.req.query();

    const data = await db.select({
        id: facilities.id,
        name: facilities.name,
        facilityType: facilities.facilityType,
    })
        .from(facilities)
        .where(eq(facilities.districtId, parseInt(districtId)))
        .orderBy(asc(facilities.name));

    if (data.length === 0) {
        return c.json(
            {
                message: "Facilities not found for this district",
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(data, HttpStatusCodes.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c) => {
    const data = await db.query.facilities.findMany();
    return c.json(data);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
    const { id } = c.req.param();
    const data = await db.query.facilities.findFirst({
        where: eq(facilities.id, parseInt(id)),
    });

    if (!data) {
        return c.json(
            {
                message: "Facility not found",
            },
            HttpStatusCodes.NOT_FOUND
        );
    }
    return c.json(data, HttpStatusCodes.OK);
};

export const getByName: AppRouteHandler<GetByNameRoute> = async (c) => {
    const query = c.req.query();

    if (!query.facilityName || query.facilityName.trim() === '') {
        return c.json(
            {
                message: "Facility name is required",
            },
            HttpStatusCodes.BAD_REQUEST
        );
    }

    const data = await db.query.facilities.findFirst({
        where: eq(facilities.name, query.facilityName.trim()),
    });

    if (!data) {
        return c.json(
            {
                message: "Facility not found",
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json({ facilityId: data.id, facilityName: data.name }, HttpStatusCodes.OK);
};

export const getPlanned: AppRouteHandler<GetPlannedRoute> = async (c) => {
    const { program, facilityType, facilityId, reportingPeriodId } = c.req.query();

    // Business rule: TB program only allows hospital facility type
    if (program === "TB" && facilityType !== "hospital") {
        return c.json(
            {
                message: "TB program requires hospital facility type",
            },
            HttpStatusCodes.BAD_REQUEST
        );
    }

    // Parse facilityId to integer with validation
    const parsedFacilityId = parseInt(facilityId);

    if (isNaN(parsedFacilityId) || parsedFacilityId <= 0) {
        return c.json(
            {
                message: "Facility ID must be a positive integer",
            },
            HttpStatusCodes.BAD_REQUEST
        );
    }

    // Verify the facility exists and is a hospital
    const userFacility = await db.query.facilities.findFirst({
        where: eq(facilities.id, parsedFacilityId),
    });

    if (!userFacility) {
        return c.json(
            {
                message: "Facility not found",
            },
            HttpStatusCodes.BAD_REQUEST
        );
    }

    if (userFacility.facilityType !== "hospital") {
        return c.json(
            {
                message: "Facility ID must reference a hospital",
            },
            HttpStatusCodes.BAD_REQUEST
        );
    }

    // Get reporting period ID - use provided or fetch active
    let parsedReportingPeriodId: number;

    if (reportingPeriodId) {
        parsedReportingPeriodId = parseInt(reportingPeriodId);

        if (isNaN(parsedReportingPeriodId) || parsedReportingPeriodId <= 0) {
            return c.json(
                {
                    message: "Reporting Period ID must be a positive integer",
                },
                HttpStatusCodes.BAD_REQUEST
            );
        }
    } else {
        // Fetch active reporting period
        const activePeriod = await getActiveReportingPeriod();

        if (!activePeriod) {
            return c.json(
                {
                    message: "No active reporting period found",
                },
                HttpStatusCodes.BAD_REQUEST
            );
        }

        parsedReportingPeriodId = activePeriod.id;
    }

    // Validate reporting period
    const validationResult = await validateReportingPeriod(parsedReportingPeriodId, 'planning');
    if (!validationResult.isValid) {
        return c.json(
            {
                message: validationResult.errorMessage,
            },
            HttpStatusCodes.BAD_REQUEST
        );
    }

    // Get facility IDs that have already been planned for this (program, facilityType, facilityId, reportingPeriodId) combination
    const plannedFacilityIds = await db
        .selectDistinct({
            facilityId: schemaFormDataEntries.facilityId,
        })
        .from(schemaFormDataEntries)
        .innerJoin(
            projects,
            eq(schemaFormDataEntries.projectId, projects.id)
        )
        .innerJoin(
            facilities,
            eq(schemaFormDataEntries.facilityId, facilities.id)
        )
        .where(
            and(
                eq(schemaFormDataEntries.entityType, "planning"),
                eq(projects.projectType, program as "HIV" | "Malaria" | "TB"),
                eq(facilities.facilityType, facilityType as "hospital" | "health_center"),
                or(
                    eq(facilities.id, parsedFacilityId),
                    eq(facilities.parentFacilityId, parsedFacilityId)
                ),
                eq(schemaFormDataEntries.reportingPeriodId, parsedReportingPeriodId)
            )
        );

    const excludedIds = plannedFacilityIds.map(f => f.facilityId);

    // Build the where conditions: facilityType + facilityId filter (hospital or its health centers)
    const conditions = [
        eq(facilities.facilityType, facilityType as "hospital" | "health_center"),
        or(
            eq(facilities.id, parsedFacilityId),  // The hospital itself
            eq(facilities.parentFacilityId, parsedFacilityId)  // Health centers under this hospital
        )
    ];

    // Exclude already planned facilities if any exist
    if (excludedIds.length > 0) {
        conditions.push(notInArray(facilities.id, excludedIds));
    }

    // Get all facilities matching the criteria within the accountant's hospital hierarchy
    const availableFacilities = await db
        .select({
            id: facilities.id,
            name: facilities.name,
        })
        .from(facilities)
        .where(and(...conditions))
        .orderBy(asc(facilities.name));

    return c.json(
        {
            program,
            facilityType,
            facilityId: parsedFacilityId,
            reportingPeriodId: parsedReportingPeriodId,
            availableFacilities,
            count: availableFacilities.length,
        },
        HttpStatusCodes.OK
    );
};

export const getExecution: AppRouteHandler<GetExecutionRoute> = async (c) => {
    const { program, facilityType, facilityId, reportingPeriodId, quarter } = c.req.query();

    // Business rule: TB program only allows hospital facility type
    if (program === "TB" && facilityType !== "hospital") {
        return c.json(
            {
                message: "TB program requires hospital facility type",
            },
            HttpStatusCodes.BAD_REQUEST
        );
    }

    // Parse facilityId to integer with validation
    const parsedFacilityId = parseInt(facilityId);

    if (isNaN(parsedFacilityId) || parsedFacilityId <= 0) {
        return c.json(
            {
                message: "Facility ID must be a positive integer",
            },
            HttpStatusCodes.BAD_REQUEST
        );
    }

    // Verify the facility exists and is a hospital
    const userFacility = await db.query.facilities.findFirst({
        where: eq(facilities.id, parsedFacilityId),
    });

    if (!userFacility) {
        return c.json(
            {
                message: "Facility not found",
            },
            HttpStatusCodes.BAD_REQUEST
        );
    }

    if (userFacility.facilityType !== "hospital") {
        return c.json(
            {
                message: "Facility ID must reference a hospital",
            },
            HttpStatusCodes.BAD_REQUEST
        );
    }

    // Get reporting period ID - use provided or fetch active
    let parsedReportingPeriodId: number;

    if (reportingPeriodId) {
        parsedReportingPeriodId = parseInt(reportingPeriodId);

        if (isNaN(parsedReportingPeriodId) || parsedReportingPeriodId <= 0) {
            return c.json(
                {
                    message: "Reporting Period ID must be a positive integer",
                },
                HttpStatusCodes.BAD_REQUEST
            );
        }
    } else {
        // Fetch active reporting period
        const activePeriod = await getActiveReportingPeriod();

        if (!activePeriod) {
            return c.json(
                {
                    message: "No active reporting period found",
                },
                HttpStatusCodes.BAD_REQUEST
            );
        }

        parsedReportingPeriodId = activePeriod.id;
    }

    // Validate quarter format when provided (additional validation beyond Zod)
    if (quarter && !["Q1", "Q2", "Q3", "Q4"].includes(quarter)) {
        return c.json(
            {
                message: "Quarter must be in format Q1, Q2, Q3, or Q4",
            },
            HttpStatusCodes.BAD_REQUEST
        );
    }

    // Validate reporting period
    const validationResult = await validateReportingPeriod(parsedReportingPeriodId, 'execution');
    if (!validationResult.isValid) {
        return c.json(
            {
                message: validationResult.errorMessage,
            },
            HttpStatusCodes.BAD_REQUEST
        );
    }

    // Auto-detect current fiscal quarter
    const currentQuarter = getCurrentFiscalQuarter();

    // Detect operation mode: quarter discovery vs single-quarter
    const isQuarterDiscoveryMode = !quarter;
    const targetQuarter = quarter || currentQuarter;

    // Step 1: Get facility IDs that HAVE been planned AND APPROVED for this (program, facilityType, facilityId, reportingPeriodId)
    const plannedFacilityIds = await db
        .selectDistinct({
            facilityId: schemaFormDataEntries.facilityId,
        })
        .from(schemaFormDataEntries)
        .innerJoin(
            projects,
            eq(schemaFormDataEntries.projectId, projects.id)
        )
        .innerJoin(
            facilities,
            eq(schemaFormDataEntries.facilityId, facilities.id)
        )
        .where(
            and(
                eq(schemaFormDataEntries.entityType, "planning"),
                eq(schemaFormDataEntries.approvalStatus, "APPROVED"),
                eq(projects.projectType, program as "HIV" | "Malaria" | "TB"),
                eq(facilities.facilityType, facilityType as "hospital" | "health_center"),
                or(
                    eq(facilities.id, parsedFacilityId),
                    eq(facilities.parentFacilityId, parsedFacilityId)
                ),
                eq(schemaFormDataEntries.reportingPeriodId, parsedReportingPeriodId)
            )
        );

    const plannedIds = plannedFacilityIds.map(f => f.facilityId);

    // If no facilities have been planned, return empty result for both modes
    if (plannedIds.length === 0) {
        if (isQuarterDiscoveryMode) {
            return c.json(
                {
                    program,
                    facilityType,
                    facilityId: parsedFacilityId,
                    reportingPeriodId: parsedReportingPeriodId,
                    currentQuarter,
                    availableFacilities: [],
                    count: 0,
                },
                HttpStatusCodes.OK
            );
        } else {
            return c.json(
                {
                    program,
                    facilityType,
                    facilityId: parsedFacilityId,
                    reportingPeriodId: parsedReportingPeriodId,
                    quarter: targetQuarter,
                    currentQuarter,
                    availableFacilities: [],
                    count: 0,
                },
                HttpStatusCodes.OK
            );
        }
    }

    // Branch handler logic based on operation mode
    if (isQuarterDiscoveryMode) {
        // Quarter Discovery Mode: Return facilities with their available quarters
        const facilityStatuses = await analyzeExecutionStatus(
            program,
            facilityType,
            parsedFacilityId,
            parsedReportingPeriodId,
            plannedIds
        );

        // Generate quarter discovery response
        const availableFacilities = facilityStatuses.map(status => ({
            id: status.facilityId,
            name: status.facilityName,
            availableQuarters: status.availableQuarters,
        }));

        return c.json(
            {
                program,
                facilityType,
                facilityId: parsedFacilityId,
                reportingPeriodId: parsedReportingPeriodId,
                currentQuarter,
                availableFacilities,
                count: availableFacilities.length,
            },
            HttpStatusCodes.OK
        );
    } else {
        // Single Quarter Mode: Return facilities available for specific quarter
        console.log(`[getExecution] Single Quarter Mode - Quarter: ${targetQuarter}, Planned IDs:`, plannedIds);
        
        const executedIds = await getExecutedFacilitiesForQuarter(
            program,
            facilityType,
            parsedFacilityId,
            parsedReportingPeriodId,
            targetQuarter
        );

        console.log(`[getExecution] Executed IDs for ${targetQuarter}:`, executedIds);

        // Build query conditions
        const conditions = [
            eq(facilities.facilityType, facilityType as "hospital" | "health_center"),
            or(
                eq(facilities.id, parsedFacilityId),
                eq(facilities.parentFacilityId, parsedFacilityId)
            ),
            inArray(facilities.id, plannedIds), // Must have a plan
        ];

        // Exclude facilities already executed for target quarter
        if (executedIds.length > 0) {
            conditions.push(notInArray(facilities.id, executedIds));
            console.log(`[getExecution] Excluding executed facilities:`, executedIds);
        } else {
            console.log(`[getExecution] No executed facilities to exclude for ${targetQuarter}`);
        }

        // Get available facilities for execution
        const availableFacilities = await db
            .select({
                id: facilities.id,
                name: facilities.name,
            })
            .from(facilities)
            .where(and(...conditions))
            .orderBy(asc(facilities.name));

        return c.json(
            {
                program,
                facilityType,
                facilityId: parsedFacilityId,
                reportingPeriodId: parsedReportingPeriodId,
                quarter: targetQuarter,
                currentQuarter,
                availableFacilities,
                count: availableFacilities.length,
            },
            HttpStatusCodes.OK
        );
    }
};

export const getAll: AppRouteHandler<GetAllRoute> = async (c) => {
    // Get user context to determine accessible facilities
    const { getUserContext } = await import("@/lib/utils/get-user-facility");
    const userContext = await getUserContext(c);
    
    // Query all facilities with district information
    const allFacilities = await db
        .select({
            id: facilities.id,
            name: facilities.name,
            facilityType: facilities.facilityType,
            districtId: facilities.districtId,
            districtName: districts.name,
        })
        .from(facilities)
        .innerJoin(districts, eq(facilities.districtId, districts.id))
        .orderBy(asc(districts.name), asc(facilities.name));
    
    // Filter to only return facilities the user has access to
    const accessibleFacilities = allFacilities.filter(facility => 
        userContext.accessibleFacilityIds.includes(facility.id)
    );

    return c.json(accessibleFacilities, HttpStatusCodes.OK);
};

export const getAccessible: AppRouteHandler<GetAccessibleRoute> = async (c) => {
    // Import FacilityHierarchyService
    const { FacilityHierarchyService } = await import("../../services/facility-hierarchy.service");
    const { auth } = await import("@/lib/auth");
    
    // Get authenticated user
    const session = await auth.api.getSession({
        headers: c.req.raw.headers,
    });

    if (!session?.user) {
        return c.json(
            { message: "Unauthorized" },
            HttpStatusCodes.UNAUTHORIZED
        );
    }

    const userId = parseInt(session.user.id);

    // Get accessible facility IDs using the hierarchy service
    const accessibleFacilityIds = await FacilityHierarchyService.getAccessibleFacilityIds(userId);

    // Query facilities with district information
    const accessibleFacilities = await db
        .select({
            id: facilities.id,
            name: facilities.name,
            facilityType: facilities.facilityType,
            districtId: facilities.districtId,
            districtName: districts.name,
            parentFacilityId: facilities.parentFacilityId,
        })
        .from(facilities)
        .innerJoin(districts, eq(facilities.districtId, districts.id))
        .where(inArray(facilities.id, accessibleFacilityIds))
        .orderBy(asc(districts.name), asc(facilities.name));

    return c.json(accessibleFacilities, HttpStatusCodes.OK);
};

export const getHierarchy: AppRouteHandler<GetHierarchyRoute> = async (c) => {
    // Import required services
    const { FacilityHierarchyService } = await import("../../services/facility-hierarchy.service");
    const { auth } = await import("@/lib/auth");
    
    // Get authenticated user
    const session = await auth.api.getSession({
        headers: c.req.raw.headers,
    });

    if (!session?.user) {
        return c.json(
            { message: "Unauthorized" },
            HttpStatusCodes.UNAUTHORIZED
        );
    }

    const userId = parseInt(session.user.id);
    const { id } = c.req.param();
    const facilityId = parseInt(id);

    // Check if user can access this facility
    const canAccess = await FacilityHierarchyService.canAccessFacility(userId, facilityId);
    
    if (!canAccess) {
        return c.json(
            { message: "Access denied: You do not have permission to view this facility" },
            HttpStatusCodes.FORBIDDEN
        );
    }

    // Get the facility with district information
    const facility = await db
        .select({
            id: facilities.id,
            name: facilities.name,
            facilityType: facilities.facilityType,
            districtId: facilities.districtId,
            districtName: districts.name,
            parentFacilityId: facilities.parentFacilityId,
        })
        .from(facilities)
        .innerJoin(districts, eq(facilities.districtId, districts.id))
        .where(eq(facilities.id, facilityId))
        .limit(1);

    if (!facility || facility.length === 0) {
        return c.json(
            { message: "Facility not found" },
            HttpStatusCodes.NOT_FOUND
        );
    }

    const facilityData = facility[0];

    // Get parent facility if exists
    let parentFacility = null;
    if (facilityData.parentFacilityId) {
        const parent = await db
            .select({
                id: facilities.id,
                name: facilities.name,
                facilityType: facilities.facilityType,
                districtId: facilities.districtId,
            })
            .from(facilities)
            .where(eq(facilities.id, facilityData.parentFacilityId))
            .limit(1);
        
        if (parent && parent.length > 0) {
            parentFacility = parent[0];
        }
    }

    // Get child facilities
    const childFacilities = await db
        .select({
            id: facilities.id,
            name: facilities.name,
            facilityType: facilities.facilityType,
            districtId: facilities.districtId,
        })
        .from(facilities)
        .where(
            and(
                eq(facilities.parentFacilityId, facilityId),
                eq(facilities.districtId, facilityData.districtId)
            )
        )
        .orderBy(asc(facilities.name));

    return c.json(
        {
            facility: facilityData,
            parentFacility,
            childFacilities,
        },
        HttpStatusCodes.OK
    );
};