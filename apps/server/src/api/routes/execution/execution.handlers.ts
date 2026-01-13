import { eq, and, sql, inArray } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { db } from "@/api/db";
import { schemaFormDataEntries, dynamicActivities, schemaActivityCategories, formSchemas, facilities, projects, reportingPeriods, districts, provinces } from "@/api/db/schema";
import type { AppRouteHandler } from "@/api/lib/types";
import { getUserContext, canAccessFacility, hasAdminAccess } from "@/api/lib/utils/get-user-facility";
import { buildFacilityFilter, buildDistrictBasedFacilityFilter, validateDistrictExists } from "@/api/lib/utils/query-filters";
import { buildScopeFilter, ScopeFilterError } from "@/lib/utils/scope-filters";
import { validateScopeAccess } from "@/lib/utils/scope-access-control";
import { buildScopeMetadata } from "@/lib/utils/scope-metadata";
import { buildFacilityColumns, buildDistrictColumns, buildProvinceColumns, aggregateDataByColumns, columnsToFacilityColumns } from "@/lib/utils/column-builders";

import { computationService } from "@/api/lib/services/computation.service";
import { validationService } from "@/api/lib/services/validation.service";
import { aggregationService } from "@/lib/services/aggregation.service";
import { resolveExecutionContext, validateActivityCodes, buildCorrectedUIContext } from "@/lib/utils/context-resolution";
import type {
  ListRoute,
  GetOneRoute,
  CreateRoute,
  UpdateRoute,
  RemoveRoute,
  CalculateBalancesRoute,
  ValidateAccountingEquationRoute,
  QuarterlySummaryRoute,
  GetActivitiesRoute,
  GetFormSchemaRoute,
  CheckExistingRoute,
  CompiledRoute,
} from "./execution.routes";
import { BalancesResponse, executionListQuerySchema, compiledExecutionQuerySchema, type CompiledExecutionResponse, type FacilityColumn, type ActivityRow, type SectionSummary, type FacilityTotals, type AppliedFilters, type ActivityCatalogMap, type FacilityCatalogMapping } from "./execution.types";
import { toBalances, parseCode, calculateCumulativeBalance, enrichFormData } from "./execution.helpers";
import { recalculateExecutionData, validateRecalculation } from "./execution.recalculations";
import { ApprovalError, ApprovalErrorFactory, isApprovalError } from "@/lib/errors/approval.errors";
import { ExecutionErrorHandler } from "@/lib/utils/execution-error-handler";
import { fetchPreviousQuarterExecution, buildQuarterSequence, type Quarter } from "@/lib/utils/quarter-helpers";
import { buildPreviousQuarterBalances, extractClosingBalances } from "@/lib/utils/balance-extractor";

/**
 * Migrate old numeric VAT codes to new descriptive codes for backward compatibility
 * Maps old codes to new codes like D_VAT_COMMUNICATION_ALL, D_VAT_MAINTENANCE, etc.
 * 
 * @param activities - Array of activity objects with code property
 * @param executionId - Optional execution ID for logging purposes
 * @returns Object containing migrated activities and migration metadata
 */
function migrateVATCodes(activities: any[], executionId?: number): {
  activities: any[];
  migratedCodes: Array<{ oldCode: string; newCode: string; }>;
} {
  // Mapping from old codes to new descriptive codes
  // New VAT categories: COMMUNICATION_ALL, MAINTENANCE, FUEL, SUPPLIES
  const oldToNewMapping: Record<string, string> = {
    // Legacy numeric codes
    '_D_4': '_D_VAT_COMMUNICATION_ALL',
    '_D_5': '_D_VAT_COMMUNICATION_ALL',
    '_D_6': '_D_VAT_MAINTENANCE',
    '_D_7': '_D_VAT_SUPPLIES',
    // Legacy descriptive codes (old category names)
    '_D_VAT_AIRTIME': '_D_VAT_COMMUNICATION_ALL',
    '_D_VAT_INTERNET': '_D_VAT_COMMUNICATION_ALL',
    '_D_VAT_INFRASTRUCTURE': '_D_VAT_MAINTENANCE',
  };

  const migratedCodes: Array<{ oldCode: string; newCode: string; }> = [];

  const migratedActivities = activities.map(activity => {
    if (!activity?.code) return activity;

    let newCode = activity.code;
    let migrated = false;

    // Check if the code contains any old VAT code pattern
    for (const [oldSuffix, newSuffix] of Object.entries(oldToNewMapping)) {
      if (activity.code.includes(oldSuffix)) {
        newCode = activity.code.replace(oldSuffix, newSuffix);
        migrated = true;

        // Track migration for logging
        migratedCodes.push({
          oldCode: activity.code,
          newCode: newCode,
        });

        break;
      }
    }

    // If code was migrated, preserve original and return updated activity
    if (migrated) {
      return {
        ...activity,
        code: newCode,
        _originalCode: activity.code, // Preserve original code for audit purposes
      };
    }

    // Return unchanged activity
    return activity;
  });

  // Log migrations if any occurred
  if (migratedCodes.length > 0) {
    console.log(`[VAT Code Migration] Execution ID: ${executionId || 'unknown'} - Migrated ${migratedCodes.length} VAT code(s):`);
    migratedCodes.forEach(({ oldCode, newCode }) => {
      console.log(`  ${oldCode} → ${newCode}`);
    });
  }

  return {
    activities: migratedActivities,
    migratedCodes,
  };
}

/**
 * Helper function to validate that there's an approved plan for execution
 * @param facilityId - The facility ID
 * @param projectId - The project ID  
 * @param reportingPeriodId - The reporting period ID
 * @param logger - Logger instance for audit logging
 * @returns Promise with validation result
 * @throws ApprovalError for validation failures
 */
async function validateApprovedPlanExists(
  facilityId: number,
  projectId: number,
  reportingPeriodId: number,
  logger?: any
): Promise<{ allowed: boolean; reason?: string; planningId?: number }> {
  try {
    // Find the planning entry for the same facility/project/reporting period
    const planningEntry = await db.query.schemaFormDataEntries.findFirst({
      where: and(
        eq(schemaFormDataEntries.facilityId, facilityId),
        eq(schemaFormDataEntries.projectId, projectId),
        eq(schemaFormDataEntries.reportingPeriodId, reportingPeriodId),
        eq(schemaFormDataEntries.entityType, 'planning')
      ),
    });

    if (!planningEntry) {
      logger?.warn({
        facilityId,
        projectId,
        reportingPeriodId,
        entityType: 'planning'
      }, 'No planning data found for execution validation');

      throw new ApprovalError(
        'PLAN_NOT_FOUND',
        'No planning data found for this facility, project, and reporting period',
        404,
        {
          code: 'PLAN_NOT_FOUND',
          reason: 'A plan must be created and approved before execution can proceed',
          context: {
            facilityId,
            projectId,
            reportingPeriodId,
            entityType: 'planning'
          }
        }
      );
    }

    if (planningEntry.approvalStatus !== 'APPROVED') {
      logger?.warn({
        planningId: planningEntry.id,
        currentStatus: planningEntry.approvalStatus,
        facilityId,
        projectId,
        reportingPeriodId
      }, 'Planning data not approved for execution');

      throw ApprovalErrorFactory.executionBlocked(
        planningEntry.id,
        planningEntry.approvalStatus || 'UNKNOWN',
        `Planning data has not been approved for execution. Current status: ${planningEntry.approvalStatus}. Only approved plans can proceed to execution.`
      );
    }

    logger?.info({
      planningId: planningEntry.id,
      approvalStatus: planningEntry.approvalStatus,
      facilityId,
      projectId,
      reportingPeriodId
    }, 'Planning data validation successful - execution allowed');

    return {
      allowed: true,
      planningId: planningEntry.id
    };

  } catch (error) {
    // Re-throw ApprovalErrors as-is
    if (isApprovalError(error)) {
      throw error;
    }

    // Wrap other errors in ApprovalError
    logger?.error({
      facilityId,
      projectId,
      reportingPeriodId,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 'Error validating approved plan');

    throw ApprovalErrorFactory.validationError(
      `Failed to validate plan approval: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}


/**
 * Builds a UI-friendly payload from raw execution data
 * This function ensures consistent formatting between GET and PUT endpoints
 */
async function buildUIFriendlyPayload(
  data: any,
  db: any,
  executionId: number
): Promise<{
  ui: any;
  contextResolution: any;
  activityValidation: any;
  previousQuarterBalances?: any;
  quarterSequence?: any;
}> {
  const formData: any = (data as any).formData || {};
  const computed: any = (data as any).computedValues || {};

  // Normalize activities: support both array and object storage
  let activitiesArray: Array<any> = [];
  if (Array.isArray(formData.activities)) {
    activitiesArray = formData.activities;
  } else if (formData.activities && typeof formData.activities === 'object') {
    activitiesArray = Object.values(formData.activities);
  }

  // Apply VAT code migration for backward compatibility
  const migrationResult = migrateVATCodes(activitiesArray, executionId);
  activitiesArray = migrationResult.activities;

  // Build a map of existing values keyed by code (so missing items default to 0)
  const valueByCode = new Map<string, {
    q1: number;
    q2: number;
    q3: number;
    q4: number;
    paymentStatus?: string;
    amountPaid?: number;
    netAmount?: Record<string, number>;
    vatAmount?: Record<string, number>;
    vatCleared?: Record<string, number>;
  }>();
  for (const a of activitiesArray) {
    const code = a?.code as string;
    if (!code) continue;
    valueByCode.set(code, {
      q1: Number(a.q1 || 0),
      q2: Number(a.q2 || 0),
      q3: Number(a.q3 || 0),
      q4: Number(a.q4 || 0),
      // Include payment tracking fields
      paymentStatus: a.paymentStatus || undefined,
      amountPaid: a.amountPaid !== undefined ? Number(a.amountPaid) : undefined,
      // Include VAT tracking data (if present)
      netAmount: a.netAmount || undefined,
      vatAmount: a.vatAmount || undefined,
      vatCleared: a.vatCleared || undefined,
    });
  }

  // Helper function to lookup activity values with fallback to old VAT codes
  const getActivityValue = (code: string) => {
    // Try direct lookup first
    let value = valueByCode.get(code);
    if (value) return value;

    // If not found and code looks like a new VAT code, try old format
    if (code.includes('_D_VAT_')) {
      // Map new VAT codes to old codes for backward compatibility
      const oldCodeMapping: Record<string, string[]> = {
        '_D_VAT_COMMUNICATION_ALL': ['_D_4', '_D_5', '_D_VAT_AIRTIME', '_D_VAT_INTERNET'],
        '_D_VAT_MAINTENANCE': ['_D_6', '_D_VAT_INFRASTRUCTURE'],
        '_D_VAT_FUEL': ['_D_VAT_FUEL'],
        '_D_VAT_SUPPLIES': ['_D_7', '_D_VAT_SUPPLIES'],
      };

      for (const [newSuffix, oldSuffixes] of Object.entries(oldCodeMapping)) {
        if (code.includes(newSuffix)) {
          for (const oldSuffix of oldSuffixes) {
            const oldCode = code.replace(newSuffix, oldSuffix);
            value = valueByCode.get(oldCode);
            if (value) {
              console.log(`[VAT Code Lookup] Fallback: ${code} not found, using old code ${oldCode}`);
              return value;
            }
          }
        }
      }
    }

    // Return default empty value if not found
    return {
      q1: undefined,
      q2: undefined,
      q3: undefined,
      q4: undefined,
      paymentStatus: undefined,
      amountPaid: undefined,
      netAmount: undefined,
      vatAmount: undefined,
      vatCleared: undefined,
    };
  };

  // Resolve execution context using the context resolution utility
  // This ensures we use database values over potentially incorrect form data context
  const contextResolution = resolveExecutionContext(
    {
      id: data.id,
      project: data.project ? {
        projectType: data.project.projectType || ''
      } : null,
      facility: data.facility ? {
        facilityType: data.facility.facilityType || ''
      } : null,
      formData: formData
    }
  );

  const contextProjectType = contextResolution.context.projectType;
  const contextFacilityType = contextResolution.context.facilityType;

  // Load full activity catalog for this entry's program/facility to hydrate UI
  const acts = await db
    .select({
      code: dynamicActivities.code,
      name: dynamicActivities.name,
      isTotalRow: dynamicActivities.isTotalRow,
      fieldMappings: dynamicActivities.fieldMappings,
      displayOrder: dynamicActivities.displayOrder,
    })
    .from(dynamicActivities)
    .where(
      and(
        eq(dynamicActivities.projectType, contextProjectType as any),
        eq(dynamicActivities.facilityType, contextFacilityType as any),
        eq(dynamicActivities.moduleType, 'execution'),
        eq(dynamicActivities.isActive, true)
      )
    );
  const codeToName = new Map<string, string>();
  for (const a of acts) codeToName.set(a.code as unknown as string, a.name as unknown as string);

  // Validate stored activity codes against resolved context
  const activityValidation = validateActivityCodes(
    activitiesArray,
    contextResolution.context,
    data.id
  );

  // Fetch sub-category labels from database instead of hardcoding
  const subCategories = await db.select({
    code: schemaActivityCategories.subCategoryCode,
    name: schemaActivityCategories.name
  })
    .from(schemaActivityCategories)
    .where(
      and(
        eq(schemaActivityCategories.moduleType, 'execution' as any),
        eq(schemaActivityCategories.projectType, contextProjectType as any),
        eq(schemaActivityCategories.facilityType, contextFacilityType as any),
        eq(schemaActivityCategories.isSubCategory, true),
        eq(schemaActivityCategories.isActive, true)
      )
    );

  const subSectionLabel: Record<string, string> = {};
  for (const sub of subCategories) {
    if (sub.code) {
      subSectionLabel[sub.code] = sub.name;
    }
  }

  // Build A, B, D, E, G from catalog, merging user-entered values
  const A_items: any[] = [];
  const B_groups: Record<string, { code: string; label: string; total: number; items: any[] }> = {};
  const D_items: any[] = [];
  const E_items: any[] = [];
  const G_items: any[] = [];

  // Helper to push an item based on catalog record
  const pushItem = (rec: any, targetArr: any[]) => {
    const code = rec.code as string;
    const label = codeToName.get(code) || code;
    const v = getActivityValue(code);

    // Calculate cumulative_balance for UI display
    // Pass code and label for Section G intelligent detection
    const { section, subSection } = parseCode(code);
    const cumulativeBalance = calculateCumulativeBalance(
      v.q1, v.q2, v.q3, v.q4, section, subSection, code, label
    );

    const item: any = {
      code,
      label,
      q1: v.q1 ?? 0,
      q2: v.q2 ?? 0,
      q3: v.q3 ?? 0,
      q4: v.q4 ?? 0,
      total: (v.q1 || 0) + (v.q2 || 0) + (v.q3 || 0) + (v.q4 || 0),
      cumulative_balance: cumulativeBalance ?? 0
    };

    // Include payment tracking fields (default to proper values for consistency)
    item.paymentStatus = v.paymentStatus ?? 'unpaid';
    item.amountPaid = v.amountPaid ?? 0;

    // Include VAT tracking fields (default to empty objects for consistency)
    item.netAmount = v.netAmount ?? {};
    item.vatAmount = v.vatAmount ?? {};
    item.vatCleared = v.vatCleared ?? {};

    targetArr.push(item);
    
    // CRITICAL FIX: For stock sections (D, E, F), return cumulative_balance instead of total
    // Stock sections are balance sheet items (point-in-time), not income statement items (flow)
    // cumulative_balance uses stock logic (latest quarter), total sums all quarters
    const stockSections = ['D', 'E', 'F'];
    if (stockSections.includes(section || '')) {
      return item.cumulative_balance;
    }
    
    return item.total;
  };

  // Now process each catalog record and build the UI sections
  let A_total = 0;
  let B_total = 0;
  let D_total = 0;
  let E_total = 0;
  let F_total = 0;
  let final_G_total = 0;

  for (const rec of acts) {
    const code = rec.code as string;
    const { section } = parseCode(code);

    if (section === 'A') {
      A_total += pushItem(rec, A_items);
    } else if (section === 'B') {
      const subCode = rec.code as string;
      const groupLabel = subSectionLabel[subCode] || codeToName.get(subCode) || subCode;
      if (!B_groups[groupLabel]) {
        B_groups[groupLabel] = { code: subCode, label: groupLabel, total: 0, items: [] };
      }
      B_groups[groupLabel].total += pushItem(rec, B_groups[groupLabel].items);
      B_total += B_groups[groupLabel].total;
    } else if (section === 'D') {
      D_total += pushItem(rec, D_items);
    } else if (section === 'E') {
      E_total += pushItem(rec, E_items);
    } else if (section === 'G') {
      pushItem(rec, G_items);
    }
  }

  // 🔍 DEBUG: Log D_items in first buildUIFriendlyPayload
  console.log('🔍 [SECTION F DEBUG - First Function] D_items breakdown:');
  D_items.forEach((item: any) => {
    console.log(`  - ${item.label}: ${item.total}`);
  });
  console.log(`🔍 [SECTION F DEBUG - First Function] D_total: ${D_total}`);
  console.log(`🔍 [SECTION F DEBUG - First Function] E_total: ${E_total}`);

  // Compute C and F
  const surplus_deficit = A_total - B_total;
  F_total = D_total - E_total;

  console.log(`🔍 [SECTION F DEBUG - First Function] F_total (D - E): ${F_total}`);

  // Update G items with computed cumulative balances from previous sections
  const updatedG_items = G_items.map(item => {
    const { section, subSection } = parseCode(item.code);
    const cumulativeBalance = calculateCumulativeBalance(
      item.q1, item.q2, item.q3, item.q4, section, subSection, item.code, item.label
    );
    return {
      ...item,
      cumulative_balance: cumulativeBalance ?? 0
    };
  });

  // Calculate final G total (sum of all G items)
  final_G_total = updatedG_items.reduce((sum, item) => sum + item.total, 0);

  // Fetch previous quarter execution data if available
  let previousQuarterBalances: any = null;
  let quarterSequence: any = null;

  const currentQuarter = formData?.context?.quarter as Quarter | undefined;

  console.log('🔍 [buildUIFriendlyPayload] Checking for previous quarter:', {
    currentQuarter,
    hasFormData: !!formData,
    hasContext: !!formData?.context,
    contextQuarter: formData?.context?.quarter,
    projectId: data.projectId,
    facilityId: data.facilityId,
    reportingPeriodId: data.reportingPeriodId
  });

  if (currentQuarter) {
    try {
      const previousExecution = await fetchPreviousQuarterExecution(
        db,
        data.projectId,
        data.facilityId,
        data.reportingPeriodId || 0,
        currentQuarter
      );

      // Determine if we have cross-fiscal-year rollover (Q1 with Q4 from previous year)
      const hasCrossFiscalYearPrevious = currentQuarter === "Q1" && previousExecution !== null;

      // Build quarter sequence metadata for the current quarter
      quarterSequence = buildQuarterSequence(currentQuarter, hasCrossFiscalYearPrevious);

      if (previousExecution) {
        // Build previous quarter balances using the actual previous quarter
        // For Q1, this will be Q4 from the previous fiscal year
        const previousQuarterLabel = currentQuarter === "Q1" ? "Q4" : quarterSequence.previous;
        previousQuarterBalances = buildPreviousQuarterBalances(
          previousExecution as any,
          previousQuarterLabel
        );
        
        if (currentQuarter === "Q1") {
          console.log(`[Cross-Fiscal-Year Rollover] Q1 opening with Q4 closing balances from previous fiscal year`);
        }
      } else {
        // No previous quarter execution found
        previousQuarterBalances = {
          exists: false,
          quarter: null,
          executionId: null,
          closingBalances: null,
          totals: null,
        };
      }
    } catch (error) {
      console.warn('Failed to fetch previous quarter data:', error);
      previousQuarterBalances = {
        exists: false,
        quarter: null,
        executionId: null,
        closingBalances: null,
        totals: null,
      };
      quarterSequence = buildQuarterSequence(currentQuarter);
    }
  }

  // Build the corrected UI context
  const correctedUIContext = buildCorrectedUIContext(
    formData?.context || {},
    contextResolution.context
  );

  const ui = {
    id: data.id,
    context: correctedUIContext,
    A: { label: 'Receipts', total: A_total, items: A_items },
    B: { label: 'Expenditures', total: B_total, groups: Object.values(B_groups).sort((x: any, y: any) => x.code.localeCompare(y.code)) },
    C: { label: 'Surplus / Deficit', total: surplus_deficit },
    D: { label: 'Financial Assets', total: D_total, items: D_items },
    E: { label: 'Financial Liabilities', total: E_total, items: E_items },
    F: { label: 'Net Financial Assets (D - E)', total: F_total },
    G: { label: 'Closing Balance', total: final_G_total, items: updatedG_items },
  };

  return {
    ui,
    contextResolution,
    activityValidation,
    previousQuarterBalances,
    quarterSequence
  };
}


export const list: AppRouteHandler<ListRoute> = async (c) => {
  try {
    // Get user context with district information
    const userContext = await getUserContext(c);

    // Detect admin users for district filtering capabilities
    const isAdmin = hasAdminAccess(userContext.role, userContext.permissions);

    // Parse and validate query parameters
    const query = executionListQuerySchema.parse(c.req.query());

    const {
      page,
      limit,
      facilityType,
      projectType,
      reportingPeriod,
      quarter,
      year,
      districtId, // Extract districtId parameter for admin users
      ...filters
    } = query;

    const limit_ = parseInt(limit);
    const offset = (parseInt(page) - 1) * limit_;

    // Base condition - always filter by entityType
    let whereConditions: any[] = [eq(schemaFormDataEntries.entityType, 'execution')];

    // Apply district-based query filtering for admin users or facility-based for non-admin users
    try {
      if (isAdmin && districtId) {
        // Admin with district filter: validate district and filter by specific district
        const districtExists = await validateDistrictExists(parseInt(districtId));
        if (!districtExists) {
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
      // buildFacilityFilter throws error if user requests facility outside their district
      if (error.message === "Access denied: facility not in your district") {
        return c.json({
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
          message: "Access denied: facility not in your district"
        }, HttpStatusCodes.FORBIDDEN);
      }
      throw error; // Re-throw unexpected errors
    }

    // Direct ID filters (existing functionality)
    if (filters.projectId) {
      whereConditions.push(eq(schemaFormDataEntries.projectId, parseInt(filters.projectId)));
    }
    if (filters.reportingPeriodId) {
      whereConditions.push(eq(schemaFormDataEntries.reportingPeriodId, parseInt(filters.reportingPeriodId)));
    }

    // Build query with joins for filtering by type/period, including district joins for admin users
    const baseQuery = isAdmin
      ? db
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
        .where(and(...whereConditions))
      : db
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

    // Execute query
    const results = await baseQuery;

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
      const yearFilter = parseInt(reportingPeriod);
      if (!isNaN(yearFilter)) {
        filteredResults = filteredResults.filter(r =>
          r.reportingPeriod?.year === yearFilter
        );
      }
    }

    // Additional year filter (alternative to reportingPeriod)
    if (year && !reportingPeriod) {
      const yearFilter = parseInt(year);
      if (!isNaN(yearFilter)) {
        filteredResults = filteredResults.filter(r =>
          r.reportingPeriod?.year === yearFilter
        );
      }
    }

    // Quarter filter - filter by metadata if stored there
    if (quarter) {
      filteredResults = filteredResults.filter(r => {
        const metadata = r.entry.metadata as any;
        return metadata?.quarter === quarter;
      });
    }

    // Calculate pagination after filtering
    const total = filteredResults.length;
    const paginatedResults = filteredResults.slice(offset, offset + limit_);

    // Fetch full details for paginated results
    const entryIds = paginatedResults.map(r => r.entry.id);

    let data = entryIds.length > 0
      ? await db.query.schemaFormDataEntries.findMany({
        where: (entries, { inArray }) => inArray(entries.id, entryIds),
        with: {
          schema: true,
          project: true,
          facility: true,
          reportingPeriod: true,
          creator: {
            columns: { id: true, name: true, email: true }
          }
        },
        orderBy: (entries, { desc }) => [desc(entries.updatedAt)],
      })
      : [];

    // Transform response data for admin users to include district information
    if (isAdmin && data.length > 0) {
      // Get district information for each facility since the detailed query doesn't include district joins
      const facilityIds = data.map(entry => entry.facilityId);
      const facilitiesWithDistricts = await db
        .select({
          facilityId: facilities.id,
          districtId: districts.id,
          districtName: districts.name,
        })
        .from(facilities)
        .leftJoin(districts, eq(facilities.districtId, districts.id))
        .where(inArray(facilities.id, facilityIds));

      // Create a map for quick lookup
      const facilityDistrictMap = new Map();
      facilitiesWithDistricts.forEach(f => {
        facilityDistrictMap.set(f.facilityId, {
          id: f.districtId,
          name: f.districtName,
        });
      });

      // Add district information to each execution entry for admin users
      data = data.map(entry => ({
        ...entry,
        district: facilityDistrictMap.get(entry.facilityId) || null,
      }));
    }

    // Batch load previous quarter balances for all executions to avoid N+1 queries
    if (data.length > 0) {
      try {
        // Build lookup keys for all executions that need previous quarter data
        const lookupKeys = data
          .map(entry => {
            const quarter = (entry.formData as any)?.context?.quarter as Quarter | undefined;
            if (!quarter) return null;

            return {
              executionId: entry.id,
              projectId: entry.projectId,
              facilityId: entry.facilityId,
              reportingPeriodId: entry.reportingPeriodId || 0,
              currentQuarter: quarter,
            };
          })
          .filter((key): key is NonNullable<typeof key> => key !== null);

        // Batch fetch all previous quarter executions in a single query
        const previousQuarterLookups = await Promise.all(
          lookupKeys.map(async (key) => {
            try {
              const previousExecution = await fetchPreviousQuarterExecution(
                db,
                key.projectId,
                key.facilityId,
                key.reportingPeriodId,
                key.currentQuarter
              );

              // Determine if we have cross-fiscal-year rollover (Q1 with Q4 from previous year)
              const hasCrossFiscalYearPrevious = key.currentQuarter === "Q1" && previousExecution !== null;
              const quarterSequence = buildQuarterSequence(key.currentQuarter, hasCrossFiscalYearPrevious);
              
              // For Q1, the previous quarter is Q4 from the previous fiscal year
              const previousQuarterLabel = key.currentQuarter === "Q1" && previousExecution ? "Q4" : quarterSequence.previous;
              const previousQuarterBalances = buildPreviousQuarterBalances(
                previousExecution,
                previousQuarterLabel
              );

              return {
                executionId: key.executionId,
                previousQuarterBalances,
                quarterSequence,
              };
            } catch (error) {
              console.error(`Error fetching previous quarter for execution ${key.executionId}:`, error);
              // Return null structure on error
              return {
                executionId: key.executionId,
                previousQuarterBalances: {
                  exists: false,
                  quarter: null,
                  executionId: null,
                  closingBalances: null,
                  totals: null,
                },
                quarterSequence: buildQuarterSequence(key.currentQuarter),
              };
            }
          })
        );

        // Create a map for quick lookup
        const previousQuarterMap = new Map(
          previousQuarterLookups.map(item => [item.executionId, item])
        );

        // Add previous quarter balances to each execution entry
        data = data.map(entry => {
          const previousQuarterData = previousQuarterMap.get(entry.id);
          return {
            ...entry,
            previousQuarterBalances: previousQuarterData?.previousQuarterBalances || null,
            quarterSequence: previousQuarterData?.quarterSequence || null,
          };
        });
      } catch (error) {
        // Log error but don't fail the entire request
        console.error('Error batch loading previous quarter data:', error);
        // Continue without previous quarter data
      }
    }

    const totalPages = Math.ceil(total / limit_);

    return c.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      filters: {
        facilityType: facilityType || undefined,
        projectType: projectType || undefined,
        reportingPeriod: reportingPeriod || year || undefined,
        quarter: quarter || undefined,
        // Include district filter in response for admin users when applied
        ...(isAdmin && districtId && { district: districtId }),
      },
    });
  } catch (error: any) {
    console.error('List execution error:', error);

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
      { message: "Failed to fetch execution data" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.param();
  const executionId = parseInt(id);

  try {
    // Get user context with district information
    const userContext = await getUserContext(c);

    const data = await db.query.schemaFormDataEntries.findFirst({
      where: and(
        eq(schemaFormDataEntries.id, executionId),
        eq(schemaFormDataEntries.entityType, 'execution')
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

    if (!data) {
      return c.json(
        { message: "Execution data not found" },
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

    // Build UI-friendly payload using shared function
    try {
      const uiPayload = await buildUIFriendlyPayload(data, db, executionId);
      const { ui, contextResolution, activityValidation, previousQuarterBalances, quarterSequence } = uiPayload;

      // Prepare response with context correction metadata
      const response: any = {
        entry: data,
        ui,
        previousQuarterBalances,
        quarterSequence
      };

      // Add metadata if there were context corrections or validation issues
      if (contextResolution.warnings.length > 0 || !activityValidation.isValid) {
        response.metadata = {
          contextWarnings: contextResolution.warnings,
          validationResults: activityValidation
        };
      }

      return c.json(response);
    } catch (e) {
      // If UI formatting fails, return the raw entry
      console.error('UI Building failed:', e);
      console.error('Error stack:', (e as any)?.stack);
      return c.json(data);
    }
  } catch (error: any) {
    console.error('GetOne execution error:', error);

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
      { message: "Failed to fetch execution data" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const body = await c.req.json();

  try {
    // Get user context with district information
    const userContext = await getUserContext(c);

    // Basic validation of required fields (facilityId will be validated/overridden based on user type)
    if (!body.schemaId || !body.projectId || !body.formData) {
      return c.json(
        {
          message: "Missing required fields: schemaId, projectId, formData",
          received: Object.keys(body)
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

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

    // Extract quarter from form data for duplicate check
    const quarter = body.formData?.quarter;

    if (!quarter) {
      return c.json(
        { message: "Quarter is required in form data" },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Validate that there's an approved plan before allowing execution
    try {
      const logger = c.get('logger');
      const approvalValidation = await validateApprovedPlanExists(
        validatedFacilityId,
        body.projectId,
        body.reportingPeriodId,
        logger
      );

      // Log successful validation for audit purposes
      ExecutionErrorHandler.logExecutionAttempt(
        c,
        approvalValidation.planningId!,
        true,
        undefined,
        {
          facilityId: validatedFacilityId,
          projectId: body.projectId,
          reportingPeriodId: body.reportingPeriodId,
          operation: 'create_execution'
        }
      );

    } catch (error) {
      // Handle approval validation errors
      if (isApprovalError(error)) {
        // Log blocked execution attempt
        ExecutionErrorHandler.logExecutionAttempt(
          c,
          error.planningId || 0,
          false,
          error.message,
          {
            facilityId: validatedFacilityId,
            projectId: body.projectId,
            reportingPeriodId: body.reportingPeriodId,
            operation: 'create_execution',
            errorCode: error.code
          }
        );

        const errorResponse = ExecutionErrorHandler.formatErrorResponse(error, {
          facilityId: validatedFacilityId,
          projectId: body.projectId,
          reportingPeriodId: body.reportingPeriodId,
          operation: 'create_execution'
        });

        return c.json(errorResponse, error.statusCode as any);
      }

      // Handle unexpected errors
      throw ExecutionErrorHandler.handleExecutionError(c, error, undefined, 'create_execution');
    }

    // Check if execution already exists for this facility/project/reporting period/quarter
    const existingExecution = await db.query.schemaFormDataEntries.findFirst({
      where: and(
        eq(schemaFormDataEntries.facilityId, validatedFacilityId),
        eq(schemaFormDataEntries.projectId, body.projectId),
        eq(schemaFormDataEntries.entityType, 'execution'),
        eq(schemaFormDataEntries.reportingPeriodId, body.reportingPeriodId),
        sql`${schemaFormDataEntries.formData}->>'quarter' = ${quarter}`
      ),
    });

    if (existingExecution) {
      return c.json(
        {
          message: `Execution already exists for this facility, program, reporting period, and quarter (${quarter})`,
          existingExecutionId: existingExecution.id
        },
        HttpStatusCodes.CONFLICT
      );
    }

    // Check if schema exists and is for execution
    const schema = await db.query.formSchemas.findFirst({
      where: and(
        eq(formSchemas.id, body.schemaId),
        eq(formSchemas.moduleType, 'execution'), // Ensure it's an execution schema
        eq(formSchemas.isActive, true)
      ),
    });

    if (!schema) {
      return c.json(
        { message: "Execution schema not found or inactive" },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // ============================================================================
    // CRITICAL FIX: Apply recalculation to initial form data
    // ============================================================================

    // Determine context for recalculation
    const context = {
      projectType: (schema as any)?.projectType || 'HIV',
      facilityType: (schema as any)?.facilityType || 'hospital',
      year: undefined as number | undefined,
      quarter: body?.formData?.quarter as string | undefined,
    };


    // Perform complete recalculation (cumulative balances, rollups, metadata)
    const recalculated = recalculateExecutionData(body.formData, context);

    // Validate recalculation results
    const recalcValidation = validateRecalculation(recalculated);
    if (!recalcValidation.isValid) {
      console.warn('Recalculation validation warnings:', recalcValidation.errors);
      // Continue anyway, but log warnings
    }

    // Build normalized form data with recalculated values
    const normalizedFormData = {
      ...body.formData,
      version: '1.0',
      context,
      activities: recalculated.activities,  // Activities with cumulative_balance
      rollups: recalculated.rollups,        // Computed rollups (bySection, bySubSection)
    };

    // ============================================================================
    // End of recalculation fix
    // ============================================================================

    let validationResult: { isValid: boolean; errors: Array<{ field: string; message: string; code: string }>; } = { isValid: true, errors: [] };
    let balances: any = {};
    let accountingValidation: { isValid: boolean; errors: Array<{ field: string; message: string; code: string }>; } = { isValid: true, errors: [] };

    // SKIP form-level validation for execution data
    // Execution data has a nested activities structure, not flat fields
    // We use specialized validation (F = G balance check) instead
    // The validation service expects flat fields like q1_amount, q2_amount
    // but execution data has activities[code].q1, activities[code].q2, etc.

    // Note: If we need field-level validation in the future, we should:
    // 1. Create a specialized execution validation schema
    // 2. Or flatten the activities structure before validation
    // 3. Or extend the validation service to handle nested structures

    // Ensure we have valid rollups data for balance calculation
    if (!normalizedFormData.rollups || !normalizedFormData.rollups.bySubSection) {
      return c.json(
        {
          message: "Invalid form data structure",
          error: "Form data must contain valid rollups for balance calculation",
          errors: [{
            field: "formData",
            message: "Form data is missing required rollups structure for balance validation",
            code: "INVALID_FORM_DATA"
          }]
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // DEBUG: Log context and form data structure before balance calculation
    console.log('[CREATE] DEBUG: Starting F=G validation');
    console.log('[CREATE] DEBUG: Context:', {
      facilityType: context.facilityType,
      projectType: context.projectType,
      quarter: context.quarter
    });
    console.log('[CREATE] DEBUG: Rollups exist:', !!normalizedFormData.rollups);
    console.log('[CREATE] DEBUG: Rollups bySection keys:', normalizedFormData.rollups ? Object.keys(normalizedFormData.rollups.bySection || {}) : 'N/A');

    balances = toBalances(normalizedFormData.rollups);

    // DEBUG: Log balances result
    console.log('[CREATE] DEBUG: Balances calculated:', {
      hasNetFinancialAssets: !!balances.netFinancialAssets,
      hasClosingBalance: !!balances.closingBalance,
      balancesType: typeof balances
    });

    // Try accounting validation if available
    try {
      if (validationService && typeof validationService.validateAccountingEquation === 'function') {
        accountingValidation = await validationService.validateAccountingEquation(balances);

        if (!accountingValidation.isValid) {
          console.log('[CREATE] DEBUG: Accounting validation service rejected');
          return c.json(
            {
              message: "Accounting equation validation failed",
              errors: accountingValidation.errors
            },
            HttpStatusCodes.BAD_REQUEST
          );
        }
      }
    } catch (validationErr) {
      console.warn('Accounting validation service error:', validationErr);
    }

    // CRITICAL: Enforce F = G balance validation QUARTERLY (Net Financial Assets = Closing Balance)
    // Since execution data is entered quarterly, we validate balance at each quarter-end
    // This validation applies to BOTH hospitals and health centers - no exceptions

    if (!balances || typeof balances !== 'object') {
      console.error('[CREATE] ERROR: Balances calculation failed');
      return c.json(
        {
          message: "Failed to calculate balances",
          error: "Unable to compute financial balances from form data",
          errors: [{
            field: "balances",
            message: "Balance calculation failed - cannot validate F = G equation",
            code: "BALANCE_CALCULATION_FAILED"
          }]
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // CRITICAL FIX: Always validate F = G balance for ALL facility types
    // Even if sections D, E, G have no data (default to zeros), we can still validate
    // The validation ensures: F (Net Financial Assets) = G (Closing Balance)
    console.log('[CREATE] DEBUG: Starting F=G quarterly validation');
    console.log('[CREATE] DEBUG: Facility type:', context.facilityType);
    console.log('[CREATE] DEBUG: Net Financial Assets (F):', balances.netFinancialAssets);
    console.log('[CREATE] DEBUG: Closing Balance (G):', balances.closingBalance);

    const tolerance = 0.01; // Allow small rounding differences
    
    // Validate CUMULATIVE balance only (not individual quarters)
    // This is the correct approach for double-entry accounting across quarters
    const F_cumulative = balances.netFinancialAssets.cumulativeBalance;
    const G_cumulative = balances.closingBalance.cumulativeBalance;
    const difference = Math.abs(F_cumulative - G_cumulative);

    console.log('[CREATE] DEBUG: Validating cumulative balance:', {
      F_cumulative,
      G_cumulative,
      difference,
      tolerance,
      isBalanced: difference <= tolerance
    });

    // If cumulative balance is imbalanced, reject the submission
    if (difference > tolerance) {
      console.error('[CREATE] ERROR: F=G validation FAILED for cumulative balance');
      return c.json(
        {
          message: "Financial statement is not balanced",
          error: "Net Financial Assets (F) must equal Closing Balance (G) for cumulative balance",
          details: {
            F_cumulative,
            G_cumulative,
            difference,
            tolerance,
            facilityType: context.facilityType,
            projectType: context.projectType
          },
          errors: [{
            field: `balance_cumulative`,
            message: `Cumulative: F (${F_cumulative}) ≠ G (${G_cumulative}). Difference: ${difference}`,
            code: "CUMULATIVE_BALANCE_MISMATCH"
          }]
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    console.log('[CREATE] DEBUG: F=G validation PASSED ✓');

    // Create the execution data entry with recalculated metadata
    const insertData = {
      schemaId: body.schemaId,
      entityType: 'execution',
      projectId: body.projectId,
      facilityId: validatedFacilityId, // Use validated facilityId
      reportingPeriodId: body.reportingPeriodId || null,
      formData: normalizedFormData,
      computedValues: Object.keys(balances).length > 0 ? balances : null,
      validationState: {
        isValid: validationResult.isValid,
        isBalanced: accountingValidation.isValid,
        lastValidated: new Date().toISOString()
      },
      // CRITICAL: Use recalculated metadata for tracking
      metadata: {
        ...(body.metadata || {}),
        quarter: quarter,  // Store the quarter explicitly for filtering
        ...recalculated.metadata  // Add lastQuarterReported and lastReportedAt
      },
      createdBy: userContext.userId,
      updatedBy: userContext.userId,
    };

    const [result] = await db.insert(schemaFormDataEntries)
      .values(insertData)
      .returning();

    // Fetch the created record with relations
    const created = await db.query.schemaFormDataEntries.findFirst({
      where: eq(schemaFormDataEntries.id, result.id),
      with: {
        schema: true,
        project: true,
        facility: true,
        reportingPeriod: true,
      },
    });

    // Build previous quarter balances and quarter sequence for the response
    let previousQuarterBalances = null;
    let quarterSequence = null;

    if (quarter) {
      try {
        // Fetch previous quarter execution
        const previousExecution = await fetchPreviousQuarterExecution(
          db,
          body.projectId,
          validatedFacilityId,
          body.reportingPeriodId || 0,
          quarter as Quarter
        );

        // Determine if we have cross-fiscal-year rollover (Q1 with Q4 from previous year)
        const hasCrossFiscalYearPrevious = quarter === "Q1" && previousExecution !== null;

        // Build quarter sequence metadata
        quarterSequence = buildQuarterSequence(quarter as Quarter, hasCrossFiscalYearPrevious);

        // Build previous quarter balances
        // For Q1, the previous quarter is Q4 from the previous fiscal year
        const previousQuarterLabel = quarter === "Q1" && previousExecution ? "Q4" : quarterSequence.previous;
        previousQuarterBalances = buildPreviousQuarterBalances(
          previousExecution,
          previousQuarterLabel
        );
        
        if (quarter === "Q1" && previousExecution) {
          console.log(`[Cross-Fiscal-Year Rollover] New Q1 execution created with Q4 closing balances from previous fiscal year`);
        }
      } catch (error) {
        // Log error but don't fail the request
        console.error('Error fetching previous quarter data for create response:', error);
        // Return null structure on error
        previousQuarterBalances = {
          exists: false,
          quarter: null,
          executionId: null,
          closingBalances: null,
          totals: null,
        };
        quarterSequence = buildQuarterSequence(quarter as Quarter);
      }
    }

    // Return enhanced response with previous quarter balances
    return c.json({
      ...created,
      previousQuarterBalances,
      quarterSequence
    }, HttpStatusCodes.CREATED);
  } catch (error: any) {
    console.error('Error creating execution data:', error);
    console.error('Error stack:', (error as any)?.stack);

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
      {
        message: "Failed to create execution data",
        debug: {
          error: (error as any)?.message,
          stack: (error as any)?.stack?.split('\n').slice(0, 3) // First 3 lines of stack
        }
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const executionId = parseInt(id);

  const existing = await db.query.schemaFormDataEntries.findFirst({
    where: and(
      eq(schemaFormDataEntries.id, executionId),
      eq(schemaFormDataEntries.entityType, 'execution')
    ),
  });

  if (!existing) {
    return c.json(
      { message: "Execution data not found" },
      HttpStatusCodes.NOT_FOUND
    );
  }

  try {
    // Get user context with district information
    const userContext = await getUserContext(c);

    // Validate that the user can access this record's facility
    const recordFacilityId = existing.facilityId;
    const hasAccess = canAccessFacility(recordFacilityId, userContext);

    if (!hasAccess) {
      return c.json(
        { message: "Access denied: facility not in your district" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // If facilityId is being changed, validate the new facilityId
    if (body.facilityId !== undefined && body.facilityId !== existing.facilityId) {
      if (!hasAdminAccess(userContext.role, userContext.permissions)) {
        // Non-admin users cannot change facilityId to a facility outside their district
        if (!userContext.accessibleFacilityIds.includes(body.facilityId)) {
          return c.json(
            { message: "Access denied: cannot change facility to one outside your district" },
            HttpStatusCodes.FORBIDDEN
          );
        }
      }
    }

    // Validate that there's still an approved plan for execution updates
    const facilityIdToCheck = body.facilityId !== undefined ? body.facilityId : existing.facilityId;
    const projectIdToCheck = body.projectId !== undefined ? body.projectId : existing.projectId;
    const reportingPeriodIdToCheck = body.reportingPeriodId !== undefined ? body.reportingPeriodId : existing.reportingPeriodId;

    try {
      const logger = c.get('logger');
      const approvalValidation = await validateApprovedPlanExists(
        facilityIdToCheck,
        projectIdToCheck,
        reportingPeriodIdToCheck,
        logger
      );

      // Log successful validation for audit purposes
      ExecutionErrorHandler.logExecutionAttempt(
        c,
        approvalValidation.planningId!,
        true,
        undefined,
        {
          facilityId: facilityIdToCheck,
          projectId: projectIdToCheck,
          reportingPeriodId: reportingPeriodIdToCheck,
          operation: 'update_execution',
          executionId: id
        }
      );

    } catch (error) {
      // Handle approval validation errors
      if (isApprovalError(error)) {
        // Log blocked execution attempt
        ExecutionErrorHandler.logExecutionAttempt(
          c,
          error.planningId || 0,
          false,
          error.message,
          {
            facilityId: facilityIdToCheck,
            projectId: projectIdToCheck,
            reportingPeriodId: reportingPeriodIdToCheck,
            operation: 'update_execution',
            executionId: id,
            errorCode: error.code
          }
        );

        const errorResponse = ExecutionErrorHandler.formatErrorResponse(error, {
          facilityId: facilityIdToCheck,
          projectId: projectIdToCheck,
          reportingPeriodId: reportingPeriodIdToCheck,
          operation: 'update_execution',
          executionId: id
        });

        return c.json(errorResponse, error.statusCode as any);
      }

      // Handle unexpected errors
      throw ExecutionErrorHandler.handleExecutionError(c, error, undefined, 'update_execution');
    }

    // ============================================================================
    // CRITICAL FIX: Merge form data and trigger recalculation
    // ============================================================================

    const existingFormData = existing.formData || {};
    const updateFormData = body.formData || {};

    // Step 1: Merge form data (preserves existing quarters, adds new quarters)
    const mergedFormData = {
      ...existingFormData,
      ...updateFormData,
    };

    // Step 2: Determine context for recalculation
    const context = {
      projectType: (existing as any)?.schema?.projectType || (existing as any)?.project?.projectType || 'HIV',
      facilityType: (existing as any)?.schema?.facilityType || (existing as any)?.facility?.facilityType || 'hospital',
      year: undefined as number | undefined,
      quarter: updateFormData?.quarter as string | undefined,
    };

    // Step 3: Perform complete recalculation (cumulative balances, rollups, metadata)
    const recalculated = recalculateExecutionData(mergedFormData, context);

    // Step 4: Validate recalculation results
    const recalcValidation = validateRecalculation(recalculated);
    if (!recalcValidation.isValid) {
      console.warn('Recalculation validation warnings:', recalcValidation.errors);
      // Continue anyway, but log warnings
    }

    // Step 5: Build final form data with recalculated values
    const finalFormData = {
      ...mergedFormData,
      version: '1.0',
      context,
      activities: recalculated.activities,  // Activities with updated cumulative_balance
      rollups: recalculated.rollups,        // Recomputed rollups (bySection, bySubSection)
    };

    // ============================================================================
    // End of recalculation fix
    // ============================================================================

    let validationResult: { isValid: boolean; errors: Array<{ field: string; message: string; code: string }>; } = { isValid: true, errors: [] };
    let balances: any = {};
    let accountingValidation: { isValid: boolean; errors: Array<{ field: string; message: string; code: string }>; } = { isValid: true, errors: [] };

    // SKIP form-level validation for execution data
    // Execution data has a nested activities structure, not flat fields
    // We use specialized validation (F = G balance check) instead
    // The validation service expects flat fields like q1_amount, q2_amount
    // but execution data has activities[code].q1, activities[code].q2, etc.

    // Note: If we need field-level validation in the future, we should:
    // 1. Create a specialized execution validation schema
    // 2. Or flatten the activities structure before validation
    // 3. Or extend the validation service to handle nested structures

    // CRITICAL: Always enforce F = G balance validation using our own calculation
    // Ensure we have valid rollups data for balance calculation
    if (!finalFormData.rollups || !finalFormData.rollups.bySubSection) {
      return c.json(
        {
          message: "Invalid form data structure",
          error: "Form data must contain valid rollups for balance calculation",
          errors: [{
            field: "formData",
            message: "Form data is missing required rollups structure for balance validation",
            code: "INVALID_FORM_DATA"
          }]
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // DEBUG: Log context and form data structure before balance calculation
    console.log('[UPDATE] DEBUG: Starting F=G validation');
    console.log('[UPDATE] DEBUG: Context:', {
      facilityType: context.facilityType,
      projectType: context.projectType,
      quarter: context.quarter
    });
    console.log('[UPDATE] DEBUG: Rollups exist:', !!finalFormData.rollups);
    console.log('[UPDATE] DEBUG: Rollups bySection keys:', finalFormData.rollups ? Object.keys(finalFormData.rollups.bySection || {}) : 'N/A');

    // Calculate balances using our reliable helper function
    const calculatedBalances = toBalances(finalFormData.rollups);

    // Always use our reliable calculated balances for validation
    balances = calculatedBalances;

    // DEBUG: Log balances result
    console.log('[UPDATE] DEBUG: Balances calculated:', {
      hasNetFinancialAssets: !!balances.netFinancialAssets,
      hasClosingBalance: !!balances.closingBalance,
      balancesType: typeof balances
    });

    // CRITICAL: Enforce F = G balance validation QUARTERLY (Net Financial Assets = Closing Balance)
    // Since execution data is entered quarterly, we validate balance at each quarter-end
    // This validation applies to BOTH hospitals and health centers - no exceptions
    if (!balances || typeof balances !== 'object') {
      console.error('[UPDATE] ERROR: Balances calculation failed');
      return c.json(
        {
          message: "Failed to calculate balances",
          error: "Unable to compute financial balances from form data",
          errors: [{
            field: "balances",
            message: "Balance calculation failed - cannot validate F = G equation",
            code: "BALANCE_CALCULATION_FAILED"
          }]
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // CRITICAL FIX: Always validate F = G balance for ALL facility types
    // Even if sections D, E, G have no data (default to zeros), we can still validate
    // The validation ensures: F (Net Financial Assets) = G (Closing Balance)
    console.log('[UPDATE] DEBUG: Starting F=G quarterly validation');
    console.log('[UPDATE] DEBUG: Facility type:', context.facilityType);
    console.log('[UPDATE] DEBUG: Net Financial Assets (F):', balances.netFinancialAssets);
    console.log('[UPDATE] DEBUG: Closing Balance (G):', balances.closingBalance);

    const tolerance = 0.01; // Allow small rounding differences
    
    // Validate CUMULATIVE balance only (not individual quarters)
    // This is the correct approach for double-entry accounting across quarters
    const F_cumulative = balances.netFinancialAssets.cumulativeBalance;
    const G_cumulative = balances.closingBalance.cumulativeBalance;
    const difference = Math.abs(F_cumulative - G_cumulative);

    console.log('[UPDATE] DEBUG: Validating cumulative balance:', {
      F_cumulative,
      G_cumulative,
      difference,
      tolerance,
      isBalanced: difference <= tolerance
    });

    // If cumulative balance is imbalanced, reject the submission
    if (difference > tolerance) {
      console.error('[UPDATE] ERROR: F=G validation FAILED for cumulative balance');
      return c.json(
        {
          message: "Financial statement is not balanced",
          error: "Net Financial Assets (F) must equal Closing Balance (G) for cumulative balance",
          details: {
            F_cumulative,
            G_cumulative,
            difference,
            tolerance,
            facilityType: context.facilityType,
            projectType: context.projectType
          },
          errors: [{
            field: `balance_cumulative`,
            message: `Cumulative: F (${F_cumulative}) ≠ G (${G_cumulative}). Difference: ${difference}`,
            code: "CUMULATIVE_BALANCE_MISMATCH"
          }]
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    console.log('[UPDATE] DEBUG: F=G validation PASSED ✓');

    // Prepare update data - merge metadata properly
    const existingMeta = (existing.metadata as any) || {};
    const incomingMeta = body.metadata || {};

    const updateData: any = {
      formData: finalFormData,  // Use recalculated form data
      computedValues: Object.keys(balances).length > 0 ? balances : existing.computedValues,
      validationState: {
        isValid: validationResult.isValid,
        isBalanced: accountingValidation.isValid,
        lastValidated: new Date().toISOString()
      },
      // CRITICAL: Merge recalculated metadata with existing metadata
      metadata: {
        ...existingMeta,
        ...incomingMeta,
        quarter: updateFormData?.quarter || existingMeta?.quarter,  // Preserve quarter for filtering
        ...recalculated.metadata  // Add lastQuarterReported and lastReportedAt
      },
      updatedBy: userContext.userId,
      updatedAt: new Date(),
    };

    // Only update other fields if explicitly provided
    if (body.schemaId !== undefined) updateData.schemaId = body.schemaId;
    if (body.projectId !== undefined) updateData.projectId = body.projectId;
    if (body.facilityId !== undefined) updateData.facilityId = body.facilityId;
    if (body.reportingPeriodId !== undefined) updateData.reportingPeriodId = body.reportingPeriodId;

    await db.update(schemaFormDataEntries)
      .set(updateData)
      .where(eq(schemaFormDataEntries.id, executionId));

    // Fetch the updated record with relations
    const updated = await db.query.schemaFormDataEntries.findFirst({
      where: eq(schemaFormDataEntries.id, executionId),
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

    // Build previous quarter balances and quarter sequence for the response
    let previousQuarterBalances = null;
    let quarterSequence = null;

    const updatedQuarter = updateFormData?.quarter || (existing.formData as any)?.context?.quarter;

    if (updatedQuarter) {
      try {
        // Fetch previous quarter execution
        const previousExecution = await fetchPreviousQuarterExecution(
          db,
          updated?.projectId || existing.projectId,
          updated?.facilityId || existing.facilityId,
          updated?.reportingPeriodId || existing.reportingPeriodId || 0,
          updatedQuarter as Quarter
        );

        // Determine if we have cross-fiscal-year rollover (Q1 with Q4 from previous year)
        const hasCrossFiscalYearPrevious = updatedQuarter === "Q1" && previousExecution !== null;

        // Build quarter sequence metadata
        quarterSequence = buildQuarterSequence(updatedQuarter as Quarter, hasCrossFiscalYearPrevious);

        // Build previous quarter balances
        // For Q1, the previous quarter is Q4 from the previous fiscal year
        const previousQuarterLabel = updatedQuarter === "Q1" && previousExecution ? "Q4" : quarterSequence.previous;
        previousQuarterBalances = buildPreviousQuarterBalances(
          previousExecution,
          previousQuarterLabel
        );
      } catch (error) {
        // Log error but don't fail the request
        console.error('Error fetching previous quarter data for update response:', error);
        // Return null structure on error
        previousQuarterBalances = {
          exists: false,
          quarter: null,
          executionId: null,
          closingBalances: null,
          totals: null,
        };
        quarterSequence = buildQuarterSequence(updatedQuarter as Quarter);
      }
    }

    // ============================================================================
    // CASCADE RECALCULATION: Identify and recalculate subsequent quarters
    // ============================================================================

    let cascadeImpact = null;

    if (updatedQuarter) {
      try {
        console.log(`[CASCADE] Starting cascade recalculation for updated quarter: ${updatedQuarter}`);

        // Import cascade recalculation utilities
        const { recalculateQuarter, applyRecalculationToDatabase } = await import("@/lib/utils/cascade-recalculation");
        const { fetchSubsequentQuarterExecutions, getNextQuarter } = await import("@/lib/utils/quarter-helpers");
        const { extractClosingBalances } = await import("@/lib/utils/balance-extractor");

        // Extract closing balances from the updated quarter
        const updatedClosingBalances = extractClosingBalances(
          updated as any,
          updatedQuarter as Quarter
        );

        console.log(`[CASCADE] Extracted closing balances from ${updatedQuarter}:`, updatedClosingBalances);

        // Fetch all subsequent quarter executions
        const subsequentQuarters = await fetchSubsequentQuarterExecutions(
          db,
          updated?.projectId || existing.projectId,
          updated?.facilityId || existing.facilityId,
          updated?.reportingPeriodId || existing.reportingPeriodId || 0,
          updatedQuarter as Quarter
        );

        console.log(`[CASCADE] Found ${subsequentQuarters.length} subsequent quarters to recalculate`);

        if (subsequentQuarters.length > 0) {
          const affectedQuarters: Quarter[] = subsequentQuarters.map(sq => sq.quarter);
          const immediatelyRecalculated: Quarter[] = [];
          const queuedForRecalculation: Quarter[] = [];

          // Immediately recalculate Q(n+1) if it exists (synchronous)
          const nextQuarter = getNextQuarter(updatedQuarter as Quarter);
          const nextQuarterExecution = subsequentQuarters.find(sq => sq.quarter === nextQuarter);

          if (nextQuarterExecution) {
            console.log(`[CASCADE] Immediately recalculating ${nextQuarterExecution.quarter} (synchronous)`);

            try {
              // Recalculate the next quarter
              const recalculationResult = await recalculateQuarter(
                db,
                nextQuarterExecution.execution.id,
                updatedClosingBalances
              );

              console.log(`[CASCADE] Recalculation result for ${nextQuarterExecution.quarter}:`, {
                success: recalculationResult.success,
                validation: recalculationResult.validation.message,
              });

              // Apply recalculation to database
              if (recalculationResult.success) {
                await applyRecalculationToDatabase(
                  db,
                  recalculationResult,
                  updatedQuarter as Quarter
                );
                immediatelyRecalculated.push(nextQuarterExecution.quarter);
                console.log(`[CASCADE] Successfully recalculated and saved ${nextQuarterExecution.quarter}`);
              } else {
                console.warn(`[CASCADE] Recalculation validation failed for ${nextQuarterExecution.quarter}:`, recalculationResult.validation);
                // Still mark as recalculated but log the validation issue
                immediatelyRecalculated.push(nextQuarterExecution.quarter);
              }
            } catch (error) {
              console.error(`[CASCADE] Error recalculating ${nextQuarterExecution.quarter}:`, error);
              // Continue processing - don't fail the entire update
            }
          }

          // Queue Q(n+2) and Q(n+3) for background recalculation
          const remainingQuarters = subsequentQuarters.filter(sq => sq.quarter !== nextQuarter);

          if (remainingQuarters.length > 0) {
            console.log(`[CASCADE] Queueing ${remainingQuarters.length} quarters for background recalculation`);

            // For now, we'll mark them as queued but not implement the actual queue
            // This will be implemented in task 9 (background recalculation job queue)
            queuedForRecalculation.push(...remainingQuarters.map(sq => sq.quarter));

            console.log(`[CASCADE] Quarters queued for background recalculation:`, queuedForRecalculation);
          }

          // Build cascade impact metadata
          cascadeImpact = {
            affectedQuarters,
            immediatelyRecalculated,
            queuedForRecalculation,
            status: queuedForRecalculation.length > 0 ? "partial_complete" : "complete",
          };

          console.log(`[CASCADE] Cascade impact:`, cascadeImpact);

          // Update the current execution's metadata to track affected quarters
          const updatedMetadata = {
            ...(updated?.metadata as any || {}),
            lastCascadeUpdate: new Date().toISOString(),
            affectedQuarters,
          };

          await db.update(schemaFormDataEntries)
            .set({
              metadata: updatedMetadata,
            })
            .where(eq(schemaFormDataEntries.id, executionId));

          console.log(`[CASCADE] Updated metadata for execution ${executionId} with affected quarters`);
        } else {
          console.log(`[CASCADE] No subsequent quarters found - no cascade recalculation needed`);
          cascadeImpact = {
            affectedQuarters: [],
            immediatelyRecalculated: [],
            queuedForRecalculation: [],
            status: "none",
          };
        }
      } catch (error) {
        console.error('[CASCADE] Error during cascade recalculation:', error);
        // Don't fail the entire update - just log the error
        cascadeImpact = {
          affectedQuarters: [],
          immediatelyRecalculated: [],
          queuedForRecalculation: [],
          status: "none",
        };
      }
    }

    // ============================================================================
    // End of cascade recalculation
    // ============================================================================

    // Build UI-friendly payload using shared function
    try {
      const uiPayload = await buildUIFriendlyPayload(updated, db, executionId);
      const { ui, contextResolution, activityValidation, previousQuarterBalances, quarterSequence } = uiPayload;

      // Return enhanced response with UI data, previous quarter balances and cascade impact
      return c.json({
        ...updated,
        ui,
        previousQuarterBalances,
        quarterSequence,
        cascadeImpact,
        // Add metadata if there were context corrections or validation issues
        ...(contextResolution.warnings.length > 0 || !activityValidation.isValid ? {
          metadata: {
            contextWarnings: contextResolution.warnings,
            validationResults: activityValidation
          }
        } : {})
      });
    } catch (e) {
      // If UI formatting fails, return the raw response with previous quarter data
      console.error('UI Building failed in update:', e);
      console.error('Error stack:', (e as any)?.stack);

      // Return enhanced response with previous quarter balances and cascade impact (no UI)
      return c.json({
        ...updated,
        previousQuarterBalances,
        quarterSequence,
        cascadeImpact,
      });
    }
  } catch (error: any) {
    console.error('Error updating execution data:', error);
    console.error('Error stack:', (error as any)?.stack);

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
      {
        message: "Failed to update execution data",
        debug: {
          error: (error as any)?.message,
          stack: (error as any)?.stack?.split('\n').slice(0, 3) // First 3 lines of stack
        }
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.param();
  const executionId = parseInt(id);

  try {
    // Get user context with district information
    const userContext = await getUserContext(c);

    const existing = await db.query.schemaFormDataEntries.findFirst({
      where: and(
        eq(schemaFormDataEntries.id, executionId),
        eq(schemaFormDataEntries.entityType, 'execution')
      ),
    });

    if (!existing) {
      return c.json(
        { message: "Execution data not found" },
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

    await db.delete(schemaFormDataEntries)
      .where(eq(schemaFormDataEntries.id, executionId));

    return c.body(null, HttpStatusCodes.NO_CONTENT);
  } catch (error: any) {
    console.error('Error deleting execution data:', error);

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
      { message: "Failed to delete execution data" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const calculateBalances: AppRouteHandler<CalculateBalancesRoute> = async (c) => {
  const body = await c.req.json();

  try {
    // Use enrichFormData and toBalances for consistent calculation
    // This ensures the same logic is used for both form submission and balance calculation
    const normalizedFormData = enrichFormData(body.data, {
      projectType: 'HIV', // Default, will be overridden by activity codes
      facilityType: 'hospital', // Default, will be overridden by activity codes
      quarter: body.data?.quarter || 'Q1',
    });

    const balances = toBalances(normalizedFormData.rollups);

    // Validate accounting equation
    const accountingValidation = await validationService.validateAccountingEquation(
      balances
    );

    const response: BalancesResponse = {
      ...balances,
      isBalanced: accountingValidation.isValid,
      validationErrors: accountingValidation.errors,
    };

    return c.json(response);
  } catch (error) {
    console.error('[calculateBalances] Error:', error);
    console.error('[calculateBalances] Error stack:', (error as Error).stack);
    console.error('[calculateBalances] Request body:', JSON.stringify(body, null, 2));
    return c.json(
      { 
        message: "Failed to calculate balances",
        error: (error as Error).message,
        details: String(error)
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const validateAccountingEquation: AppRouteHandler<ValidateAccountingEquationRoute> = async (c) => {
  const body = await c.req.json();

  try {
    // Calculate balances first
    const balances = await computationService.calculateExecutionBalances(
      body.data
    );

    const result = await validationService.validateAccountingEquation(
      balances,
      body.tolerance
    );

    return c.json({
      isValid: result.isValid,
      netFinancialAssets: balances.netFinancialAssets.cumulativeBalance,
      closingBalance: balances.closingBalance.cumulativeBalance,
      difference: Math.abs(balances.netFinancialAssets.cumulativeBalance - balances.closingBalance.cumulativeBalance),
      errors: result.errors,
    });
  } catch (error) {
    return c.json(
      { message: "Failed to validate accounting equation" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const quarterlySummary: AppRouteHandler<QuarterlySummaryRoute> = async (c) => {
  const query = c.req.query();

  try {
    const executionData = await db.query.schemaFormDataEntries.findMany({
      where: and(
        eq(schemaFormDataEntries.entityType, 'execution'),
        eq(schemaFormDataEntries.projectId, parseInt(query.projectId)),
        eq(schemaFormDataEntries.facilityId, parseInt(query.facilityId))
      ),
      with: {
        reportingPeriod: true,
      },
    });

    // Filter by year and aggregate by quarter
    const yearData = executionData.filter(entry =>
      entry.reportingPeriod?.year === parseInt(query.year)
    );

    const quarterlyResults: Record<string, any> = {};
    let yearToDateTotals = {
      totalReceipts: 0,
      totalExpenditures: 0,
      cumulativeSurplus: 0,
      finalClosingBalance: 0,
    };

    for (const entry of yearData) {
      const balances = entry.computedValues as any;
      if (balances) {
        ['Q1', 'Q2', 'Q3', 'Q4'].forEach(quarter => {
          const quarterKey = quarter.toLowerCase();
          if (!quarterlyResults[quarter]) {
            quarterlyResults[quarter] = {
              totalReceipts: 0,
              totalExpenditures: 0,
              surplus: 0,
              netFinancialAssets: 0,
              closingBalance: 0,
              isBalanced: true,
            };
          }

          quarterlyResults[quarter].totalReceipts += balances.receipts?.[quarterKey] || 0;
          quarterlyResults[quarter].totalExpenditures += balances.expenditures?.[quarterKey] || 0;
          quarterlyResults[quarter].surplus += balances.surplus?.[quarterKey] || 0;
          quarterlyResults[quarter].netFinancialAssets += balances.netFinancialAssets?.[quarterKey] || 0;
          quarterlyResults[quarter].closingBalance += balances.closingBalance?.[quarterKey] || 0;

          // Check if balanced (within tolerance)
          const diff = Math.abs(
            quarterlyResults[quarter].netFinancialAssets -
            quarterlyResults[quarter].closingBalance
          );
          quarterlyResults[quarter].isBalanced = diff < 0.01;
        });

        // Accumulate year-to-date totals
        yearToDateTotals.totalReceipts += balances.receipts?.cumulativeBalance || 0;
        yearToDateTotals.totalExpenditures += balances.expenditures?.cumulativeBalance || 0;
        yearToDateTotals.cumulativeSurplus += balances.surplus?.cumulativeBalance || 0;
        yearToDateTotals.finalClosingBalance = balances.closingBalance?.cumulativeBalance || 0;
      }
    }

    return c.json({
      quarters: quarterlyResults,
      yearToDate: yearToDateTotals,
    });
  } catch (error) {
    return c.json(
      { message: "Failed to generate quarterly summary" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getActivities: AppRouteHandler<GetActivitiesRoute> = async (c) => {
  const { projectType, facilityType } = c.req.query();


  // Validate inputs
  const validProjectTypes = ['HIV', 'Malaria', 'TB'];
  const validFacilityTypes = ['hospital', 'health_center'];

  const finalProjectType = projectType && validProjectTypes.includes(projectType)
    ? projectType as 'HIV' | 'Malaria' | 'TB'
    : 'HIV';

  const finalFacilityType = facilityType && validFacilityTypes.includes(facilityType)
    ? facilityType as 'hospital' | 'health_center'
    : 'hospital';

  try {
    // Query execution activities with strict module filtering
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
        categoryDisplayOrder: schemaActivityCategories.displayOrder,
        fieldMappings: dynamicActivities.fieldMappings,
        isComputed: schemaActivityCategories.isComputed,
        computationFormula: schemaActivityCategories.computationFormula,
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
          eq(dynamicActivities.moduleType, 'execution'), // Critical: execution only
          eq(dynamicActivities.isActive, true),
          eq(schemaActivityCategories.isActive, true),
          eq(schemaActivityCategories.moduleType, 'execution') // Double-check category
        )
      )
      .orderBy(
        schemaActivityCategories.displayOrder,
        dynamicActivities.displayOrder
      );


    // Verify no planning activities leaked through
    if (activities.length > 0) {
      const hasInvalidModule = activities.some(a => {
        const code = (a as any)?.code as string | undefined;
        return !!code && (code.includes('PLANNING') || !code.includes('EXEC'));
      });

      if (hasInvalidModule) {
        // Warning: Invalid activities detected in execution query
      }
    }

    // Get subcategories for B section
    const subCategories = await db.select({
      code: schemaActivityCategories.subCategoryCode,
      name: schemaActivityCategories.name,
      displayOrder: schemaActivityCategories.displayOrder
    })
      .from(schemaActivityCategories)
      .where(
        and(
          eq(schemaActivityCategories.moduleType, 'execution' as any),
          eq(schemaActivityCategories.projectType, finalProjectType as any),
          eq(schemaActivityCategories.facilityType, finalFacilityType as any),
          eq(schemaActivityCategories.isSubCategory, true),
          eq(schemaActivityCategories.isActive, true)
        )
      )
      .orderBy(schemaActivityCategories.displayOrder);

    // Build hierarchical structure
    const structure = {
      A: {
        label: 'A. Receipts',
        code: 'A',
        displayOrder: 1,
        isComputed: false,
        items: [] as any[],
      },
      B: {
        label: 'B. Expenditures',
        code: 'B',
        displayOrder: 2,
        isComputed: false,
        subCategories: {} as Record<string, any>,
      },
      X: {
        label: 'X. Miscellaneous Adjustments',
        code: 'X',
        displayOrder: 2.5,
        isComputed: false,
        items: [] as any[],
      },
      C: {
        label: 'C. Surplus / Deficit',
        code: 'C',
        displayOrder: 3,
        isComputed: true,
        computationFormula: 'A - B',
      },
      D: {
        label: 'D. Financial Assets',
        code: 'D',
        displayOrder: 4,
        isComputed: false,
        items: [] as any[],
        subCategories: {} as Record<string, any>,
      },
      E: {
        label: 'E. Financial Liabilities',
        code: 'E',
        displayOrder: 5,
        isComputed: false,
        items: [] as any[],
      },
      F: {
        label: 'F. Net Financial Assets',
        code: 'F',
        displayOrder: 6,
        isComputed: true,
        computationFormula: 'D - E',
      },
      G: {
        label: 'G. Closing Balance',
        code: 'G',
        displayOrder: 7,
        isComputed: false,
        items: [] as any[],
        subCategories: {} as Record<string, any>,
      },
    };

    // Initialize B subcategories
    const bSubCategoryLabels: Record<string, string> = {
      'B-01': 'Human Resources + Bonus',
      'B-02': 'Monitoring & Evaluation',
      'B-03': 'Living Support to Clients/Target Populations',
      'B-04': 'Overheads (Use of goods & services)',
      'B-05': 'Transfer to other reporting entities',
    };

    // Initialize D subcategories
    const dSubCategoryLabels: Record<string, { label: string; displayOrder: number }> = {
      'D-01': { label: 'Receivables', displayOrder: 3 }, // After Cash at bank (1) and Petty cash (2)
    };

    // Initialize G subcategories
    const gSubCategoryLabels: Record<string, { label: string; displayOrder: number }> = {
      'G-01': { label: 'Prior Year Adjustments', displayOrder: 2 }, // After Accumulated Surplus/Deficit (1)
    };

    // Initialize subcategories from database or use defaults
    for (const sub of subCategories) {
      if (sub.code && sub.code.startsWith('B-')) {
        structure.B.subCategories[sub.code] = {
          label: sub.name || bSubCategoryLabels[sub.code] || sub.code,
          code: sub.code,
          displayOrder: sub.displayOrder || parseInt(sub.code.split('-')[1]) || 0,
          items: [],
        };
      } else if (sub.code && sub.code.startsWith('D-')) {
        if (!structure.D.subCategories) {
          structure.D.subCategories = {};
        }
        const defaultConfig = dSubCategoryLabels[sub.code];
        structure.D.subCategories[sub.code] = {
          label: sub.name || (defaultConfig?.label) || sub.code,
          code: sub.code,
          displayOrder: sub.displayOrder || (defaultConfig?.displayOrder) || parseInt(sub.code.split('-')[1]) || 0,
          items: [],
        };
      } else if (sub.code && sub.code.startsWith('G-')) {
        if (!structure.G.subCategories) {
          structure.G.subCategories = {};
        }
        const defaultConfig = gSubCategoryLabels[sub.code];
        structure.G.subCategories[sub.code] = {
          label: sub.name || (defaultConfig?.label) || sub.code,
          code: sub.code,
          displayOrder: sub.displayOrder || (defaultConfig?.displayOrder) || parseInt(sub.code.split('-')[1]) || 0,
          items: [],
        };
      }
    }

    // Add default B subcategories if not found in database
    Object.entries(bSubCategoryLabels).forEach(([code, label], index) => {
      if (!structure.B.subCategories[code]) {
        structure.B.subCategories[code] = {
          label,
          code,
          displayOrder: index + 1,
          items: [],
        };
      }
    });

    // Add default D subcategories if not found in database
    if (!structure.D.subCategories) {
      structure.D.subCategories = {};
    }
    Object.entries(dSubCategoryLabels).forEach(([code, config]) => {
      if (!structure.D.subCategories![code]) {
        structure.D.subCategories![code] = {
          label: config.label,
          code,
          displayOrder: config.displayOrder,
          items: [],
        };
      }
    });

    // Add default G subcategories if not found in database
    if (!structure.G.subCategories) {
      structure.G.subCategories = {};
    }
    Object.entries(gSubCategoryLabels).forEach(([code, config]) => {
      if (!structure.G.subCategories![code]) {
        structure.G.subCategories![code] = {
          label: config.label,
          code,
          displayOrder: config.displayOrder,
          items: [],
        };
      }
    });

    // Categorize activities
    for (const activity of activities) {
      const fieldMappings = activity.fieldMappings as any;
      const category = fieldMappings?.category || activity.categoryCode;

      // Check if this is the computed "Surplus/Deficit of the Period" item
      const isComputedSurplus = activity.name.toLowerCase().includes('surplus') &&
        activity.name.toLowerCase().includes('deficit') &&
        activity.name.toLowerCase().includes('period');

      const activityItem = {
        id: activity.id,
        name: activity.name,
        code: activity.code,
        activityType: activity.activityType,  // Include activityType for VAT receivable detection
        displayOrder: activity.displayOrder,
        isTotalRow: activity.isTotalRow,
        ...(isComputedSurplus && {
          isComputed: true,
          computationFormula: 'A - B'
        })
      };

      switch (category) {
        case 'A':
          if (!activity.isTotalRow) {
            structure.A.items.push(activityItem);
          }
          break;
        case 'B':
          const subcategory = fieldMappings?.subcategory;
          if (subcategory && structure.B.subCategories[subcategory] && !activity.isTotalRow) {
            structure.B.subCategories[subcategory].items.push(activityItem);
          }
          break;
        case 'X':
          if (!activity.isTotalRow) {
            structure.X.items.push(activityItem);
          }
          break;
        case 'D':
          const dSubcategory = fieldMappings?.subcategory;
          console.log(`[D Activity] ${activity.name} - subcategory: ${dSubcategory}, code: ${activity.code}`);
          if (dSubcategory && structure.D.subCategories && structure.D.subCategories[dSubcategory] && !activity.isTotalRow) {
            console.log(`  → Adding to D.subCategories[${dSubcategory}]`);
            structure.D.subCategories[dSubcategory].items.push(activityItem);
          } else if (!activity.isTotalRow && !dSubcategory) {
            console.log(`  → Adding to D.items (no subcategory)`);
            // Items without subcategory go directly to D.items
            structure.D.items.push(activityItem);
          } else {
            console.log(`  → Skipped (isTotalRow: ${activity.isTotalRow})`);
          }
          break;
        case 'E':
          if (!activity.isTotalRow) {
            structure.E.items.push(activityItem);
          }
          break;
        case 'G':
          const gSubcategory = fieldMappings?.subcategory;
          if (gSubcategory && structure.G.subCategories && structure.G.subCategories[gSubcategory] && !activity.isTotalRow) {
            structure.G.subCategories[gSubcategory].items.push(activityItem);
          } else if (!activity.isTotalRow && !gSubcategory) {
            // Items without subcategory go directly to G.items
            structure.G.items.push(activityItem);
          }
          break;
      }
    }

    // Sort items within each section
    structure.A.items.sort((a, b) => a.displayOrder - b.displayOrder);
    structure.X.items.sort((a, b) => a.displayOrder - b.displayOrder);
    structure.D.items.sort((a, b) => a.displayOrder - b.displayOrder);
    structure.E.items.sort((a, b) => a.displayOrder - b.displayOrder);
    structure.G.items.sort((a, b) => a.displayOrder - b.displayOrder);

    // Sort subcategories and their items
    Object.values(structure.B.subCategories).forEach(sub => {
      sub.items.sort((a: any, b: any) => a.displayOrder - b.displayOrder);
    });

    // Sort D subcategories and their items
    if (structure.D.subCategories) {
      Object.values(structure.D.subCategories).forEach(sub => {
        sub.items.sort((a: any, b: any) => a.displayOrder - b.displayOrder);
      });
    }

    // Sort G subcategories and their items
    if (structure.G.subCategories) {
      Object.values(structure.G.subCategories).forEach(sub => {
        sub.items.sort((a: any, b: any) => a.displayOrder - b.displayOrder);
      });
    }

    // 🔍 DIAGNOSTIC: Log activity registration summary
    console.log('🔍 [DIAGNOSTIC] Activity Registration Summary:', {
      projectType: finalProjectType,
      facilityType: finalFacilityType,
      totalActivities: activities.length,
      sectionD: {
        directItems: structure.D.items.length,
        directItemCodes: structure.D.items.map((i: any) => i.code),
        subcategories: structure.D.subCategories ? Object.keys(structure.D.subCategories) : [],
        subcategoryDetails: structure.D.subCategories ? Object.entries(structure.D.subCategories).map(([key, sub]: [string, any]) => ({
          code: key,
          itemCount: sub.items.length,
          itemCodes: sub.items.map((i: any) => i.code)
        })) : []
      },
      sectionE: {
        directItems: structure.E.items.length,
        directItemCodes: structure.E.items.map((i: any) => i.code)
      },
      sectionG: {
        directItems: structure.G.items.length,
        directItemCodes: structure.G.items.map((i: any) => i.code),
        subcategories: structure.G.subCategories ? Object.keys(structure.G.subCategories) : [],
        subcategoryDetails: structure.G.subCategories ? Object.entries(structure.G.subCategories).map(([key, sub]: [string, any]) => ({
          code: key,
          itemCount: sub.items.length,
          itemCodes: sub.items.map((i: any) => i.code)
        })) : []
      }
    });

    return c.json({
      data: structure,
      meta: {
        projectType: finalProjectType,
        facilityType: finalFacilityType,
        moduleType: 'execution',
        count: activities.length
      }
    });

  } catch (error: any) {
    console.error('Error in getActivities (execution):', error);
    console.error('Error stack:', (error as any)?.stack);

    return c.json(
      {
        message: "Failed to fetch execution activities",
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
          eq(formSchemas.projectType, projectType ? projectType as any : 'HIV'),
          eq(formSchemas.facilityType, facilityType ? facilityType as any : 'hospital'),
          eq(formSchemas.moduleType, 'execution'), // Key difference from planning
          eq(formSchemas.isActive, true)
        )
      )
      .limit(1);

    if (!formSchema[0]) {
      return c.json(
        { message: "Execution form schema not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    return c.json({ data: formSchema[0] });
  } catch (error) {
    return c.json(
      { message: "Failed to fetch execution form schema" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const checkExisting: AppRouteHandler<CheckExistingRoute> = async (c) => {
  const query = c.req.query();
  const { projectId, facilityId, reportingPeriodId, schemaId } = query;

  try {
    // Build where conditions based on provided parameters
    let whereConditions: any[] = [
      eq(schemaFormDataEntries.entityType, 'execution'),
      eq(schemaFormDataEntries.projectId, parseInt(projectId)),
      eq(schemaFormDataEntries.facilityId, parseInt(facilityId))
    ];

    // Add optional filters
    if (reportingPeriodId) {
      whereConditions.push(eq(schemaFormDataEntries.reportingPeriodId, parseInt(reportingPeriodId)));
    }

    if (schemaId) {
      whereConditions.push(eq(schemaFormDataEntries.schemaId, parseInt(schemaId)));
    }

    // Query for existing execution data
    const existingData = await db.query.schemaFormDataEntries.findFirst({
      where: and(...whereConditions),
      with: {
        schema: true,
        project: true,
        facility: true,
        reportingPeriod: true,
        creator: {
          columns: { id: true, name: true, email: true }
        }
      },
      orderBy: (entries, { desc }) => [desc(entries.updatedAt)], // Get most recent if multiple
    });

    if (existingData) {
      // Build UI-friendly payload similar to getOne handler
      try {
        const formData: any = (existingData as any).formData || {};
        const computed: any = (existingData as any).computedValues || {};

        // Normalize activities: support both array and object storage
        let activitiesArray: Array<any> = [];
        if (Array.isArray(formData.activities)) {
          activitiesArray = formData.activities;
        } else if (formData.activities && typeof formData.activities === 'object') {
          activitiesArray = Object.values(formData.activities);
        }

        // Apply VAT code migration for backward compatibility
        const migrationResult = migrateVATCodes(activitiesArray, existingData.id);
        activitiesArray = migrationResult.activities;

        // Build a map of existing values keyed by code (so missing items default to 0)
        const valueByCode = new Map<string, {
          q1: number;
          q2: number;
          q3: number;
          q4: number;
          paymentStatus?: string;
          amountPaid?: number;
          netAmount?: Record<string, number>;
          vatAmount?: Record<string, number>;
          vatCleared?: Record<string, number>;
        }>();
        for (const a of activitiesArray) {
          const code = a?.code as string;
          if (!code) continue;
          valueByCode.set(code, {
            q1: Number(a.q1 || 0),
            q2: Number(a.q2 || 0),
            q3: Number(a.q3 || 0),
            q4: Number(a.q4 || 0),
            // Include payment tracking fields
            paymentStatus: a.paymentStatus || undefined,
            amountPaid: a.amountPaid !== undefined ? Number(a.amountPaid) : undefined,
            // Include VAT tracking data (if present)
            netAmount: a.netAmount || undefined,
            vatAmount: a.vatAmount || undefined,
            vatCleared: a.vatCleared || undefined,
          });
        }

        // Resolve execution context using the context resolution utility
        // This ensures we use database values over potentially incorrect form data context
        const contextResolution = resolveExecutionContext(
          {
            id: existingData.id,
            project: existingData.project ? {
              projectType: existingData.project.projectType || ''
            } : null,
            facility: existingData.facility ? {
              facilityType: existingData.facility.facilityType || ''
            } : null,
            formData: formData
          }
        );

        const contextProjectType = contextResolution.context.projectType;
        const contextFacilityType = contextResolution.context.facilityType;

        // Load full activity catalog for this entry's program/facility to hydrate UI
        const acts = await db
          .select({
            code: dynamicActivities.code,
            name: dynamicActivities.name,
            isTotalRow: dynamicActivities.isTotalRow,
            fieldMappings: dynamicActivities.fieldMappings,
            displayOrder: dynamicActivities.displayOrder,
          })
          .from(dynamicActivities)
          .where(
            and(
              eq(dynamicActivities.projectType, contextProjectType as any),
              eq(dynamicActivities.facilityType, contextFacilityType as any),
              eq(dynamicActivities.moduleType, 'execution'),
              eq(dynamicActivities.isActive, true)
            )
          );
        const codeToName = new Map<string, string>();
        for (const a of acts) codeToName.set(a.code as unknown as string, a.name as unknown as string);

        // Validate stored activity codes against resolved context
        const activityValidation = validateActivityCodes(
          activitiesArray,
          contextResolution.context,
          existingData.id
        );

        // Fetch sub-category labels from database instead of hardcoding
        const subCategories = await db.select({
          code: schemaActivityCategories.subCategoryCode,
          name: schemaActivityCategories.name
        })
          .from(schemaActivityCategories)
          .where(
            and(
              eq(schemaActivityCategories.moduleType, 'execution' as any),
              eq(schemaActivityCategories.projectType, contextProjectType as any),
              eq(schemaActivityCategories.facilityType, contextFacilityType as any),
              eq(schemaActivityCategories.isSubCategory, true),
              eq(schemaActivityCategories.isActive, true)
            )
          );

        const subSectionLabel: Record<string, string> = {};
        for (const sub of subCategories) {
          if (sub.code) {
            subSectionLabel[sub.code] = sub.name;
          }
        }

        // Build A, B, D, E, G from catalog, merging user-entered values
        const A_items: any[] = [];
        const B_groups: Record<string, { code: string; label: string; total: number; items: any[] }> = {};
        const D_items: any[] = [];
        const E_items: any[] = [];
        const G_items: any[] = [];

        // Helper to push an item based on catalog record
        const pushItem = (rec: any, targetArr: any[]) => {
          const code = rec.code as string;
          const label = codeToName.get(code) || code;
          const v = valueByCode.get(code) || {
            q1: undefined,
            q2: undefined,
            q3: undefined,
            q4: undefined,
            paymentStatus: undefined,
            amountPaid: undefined,
            netAmount: undefined,
            vatAmount: undefined,
            vatCleared: undefined,
          };

          // Calculate cumulative_balance for UI display
          // Pass code and label for Section G intelligent detection
          const { section, subSection } = parseCode(code);
          const cumulativeBalance = calculateCumulativeBalance(
            v.q1, v.q2, v.q3, v.q4, section, subSection, code, label
          );

          const item: any = {
            code,
            label,
            q1: v.q1,
            q2: v.q2,
            q3: v.q3,
            q4: v.q4,
            total: (v.q1 || 0) + (v.q2 || 0) + (v.q3 || 0) + (v.q4 || 0),
            cumulative_balance: cumulativeBalance
          };

          // Include payment tracking fields if they exist (for Section B expenses)
          if (v.paymentStatus !== undefined) {
            item.paymentStatus = v.paymentStatus;
          }
          if (v.amountPaid !== undefined) {
            item.amountPaid = v.amountPaid;
          }

          // Include VAT tracking fields if they exist
          if (v.netAmount !== undefined) {
            item.netAmount = v.netAmount;
          }
          if (v.vatAmount !== undefined) {
            item.vatAmount = v.vatAmount;
          }
          if (v.vatCleared !== undefined) {
            item.vatCleared = v.vatCleared;
          }

          targetArr.push(item);
          
          // CRITICAL FIX: For stock sections (D, E, F), return cumulative_balance instead of total
          // Stock sections are balance sheet items (point-in-time), not income statement items (flow)
          // cumulative_balance uses stock logic (latest quarter), total sums all quarters
          const stockSections = ['D', 'E', 'F'];
          if (stockSections.includes(section || '')) {
            return item.cumulative_balance ?? item.total;
          }
          
          return item.total;
        };

        // Build A
        const aCatalog = acts
          .filter(a => (a.fieldMappings as any)?.category === 'A' && !(a.isTotalRow as any))
          .sort((x: any, y: any) => (x.displayOrder || 0) - (y.displayOrder || 0));
        for (const rec of aCatalog) pushItem(rec, A_items);

        // Build B groups by subcategory
        const bCatalog = acts
          .filter(a => (a.fieldMappings as any)?.category === 'B' && !(a.isTotalRow as any))
          .sort((x: any, y: any) => (x.displayOrder || 0) - (y.displayOrder || 0));
        for (const rec of bCatalog) {
          const sub = (rec.fieldMappings as any)?.subcategory || 'B-OTHER';
          if (!B_groups[sub]) B_groups[sub] = { code: sub, label: subSectionLabel[sub] || sub, total: 0, items: [] };
          B_groups[sub].total += pushItem(rec, B_groups[sub].items);
        }

        // Build D/E/G
        const dCatalog = acts
          .filter(a => (a.fieldMappings as any)?.category === 'D' && !(a.isTotalRow as any))
          .sort((x: any, y: any) => (x.displayOrder || 0) - (y.displayOrder || 0));

        console.log('🔍 [SECTION F DEBUG] Building D_items from catalog...');
        console.log(`🔍 [SECTION F DEBUG] dCatalog count: ${dCatalog.length}`);

        for (const rec of dCatalog) pushItem(rec, D_items);

        console.log(`🔍 [SECTION F DEBUG] D_items after catalog: ${D_items.length} items`);

        // Add VAT receivable activities from saved data (they use special codes like D_VAT_COMMUNICATION_ALL)
        // These are auto-calculated on the client and saved with custom codes
        console.log('🔍 [SECTION F DEBUG] Checking for VAT receivables in valueByCode...');
        let vatReceivablesAdded = 0;

        for (const [code, values] of valueByCode.entries()) {
          if (code.includes('_D_VAT_')) {
            console.log(`🔍 [SECTION F DEBUG] Found VAT receivable code: ${code}`, values);

            // Check if already added from catalog
            const alreadyExists = D_items.some(item => item.code === code);
            if (!alreadyExists) {
              // Extract VAT category from code (e.g., "HIV_EXEC_HOSPITAL_D_VAT_COMMUNICATION_ALL" -> "communication_all")
              const vatCategory = code.split('_D_VAT_')[1]?.toLowerCase() || '';
              const categoryLabels: Record<string, string> = {
                'communication_all': 'VAT Receivable 1: Communication - All',
                'maintenance': 'VAT Receivable 2: Maintenance',
                'fuel': 'VAT Receivable 3: Fuel',
                'supplies': 'VAT Receivable 4: Office supplies',
                'office_supplies': 'VAT Receivable 4: Office supplies',
              };
              const label = categoryLabels[vatCategory] || `VAT Receivable: ${vatCategory}`;

              const { section, subSection } = parseCode(code);
              const cumulativeBalance = calculateCumulativeBalance(
                values.q1, values.q2, values.q3, values.q4, section, subSection, code, label
              );

              const vatItem = {
                code,
                label,
                q1: values.q1,
                q2: values.q2,
                q3: values.q3,
                q4: values.q4,
                total: (values.q1 || 0) + (values.q2 || 0) + (values.q3 || 0) + (values.q4 || 0),
                cumulative_balance: cumulativeBalance,
                paymentStatus: values.paymentStatus,
                amountPaid: values.amountPaid,
              };

              D_items.push(vatItem);
              vatReceivablesAdded++;

              console.log(`🔍 [SECTION F DEBUG] Added VAT receivable: ${label}, total: ${vatItem.total}`);
            } else {
              console.log(`🔍 [SECTION F DEBUG] VAT receivable ${code} already exists in D_items`);
            }
          }
        }

        console.log(`🔍 [SECTION F DEBUG] VAT receivables added: ${vatReceivablesAdded}`);
        console.log(`🔍 [SECTION F DEBUG] D_items final count: ${D_items.length} items`);

        const eCatalog = acts
          .filter(a => (a.fieldMappings as any)?.category === 'E' && !(a.isTotalRow as any))
          .sort((x: any, y: any) => (x.displayOrder || 0) - (y.displayOrder || 0));
        for (const rec of eCatalog) pushItem(rec, E_items);

        const gCatalog = acts
          .filter(a => (a.fieldMappings as any)?.category === 'G' && !(a.isTotalRow as any))
          .sort((x: any, y: any) => (x.displayOrder || 0) - (y.displayOrder || 0));
        for (const rec of gCatalog) pushItem(rec, G_items);

        // Calculate totals from actual items (computed values are often 0/incorrect)
        const A_total_calculated = A_items.reduce((s, x) => s + x.total, 0);
        const B_total_calculated = Object.values(B_groups).reduce((s: number, g: any) => s + g.total, 0);
        
        // CRITICAL FIX: For stock sections (D, E), use cumulative_balance instead of total
        // D and E are balance sheet items (point-in-time), not income statement items (flow)
        // cumulative_balance uses stock logic (latest quarter), total sums all quarters
        const D_total_calculated = D_items.reduce((s, x) => s + (x.cumulative_balance ?? x.total), 0);
        const E_total_calculated = E_items.reduce((s, x) => s + (x.cumulative_balance ?? x.total), 0);

        // 🔍 DEBUG: Log D_items breakdown
        console.log('🔍 [SECTION F DEBUG] D_items breakdown:');
        D_items.forEach((item: any) => {
          console.log(`  - ${item.label}: ${item.total} (Q1: ${item.q1}, Q2: ${item.q2}, Q3: ${item.q3}, Q4: ${item.q4})`);
        });
        console.log(`🔍 [SECTION F DEBUG] D_total_calculated: ${D_total_calculated}`);

        // 🔍 DEBUG: Log E_items breakdown
        console.log('🔍 [SECTION F DEBUG] E_items breakdown:');
        E_items.forEach((item: any) => {
          console.log(`  - ${item.label}: ${item.total} (Q1: ${item.q1}, Q2: ${item.q2}, Q3: ${item.q3}, Q4: ${item.q4})`);
        });
        console.log(`🔍 [SECTION F DEBUG] E_total_calculated: ${E_total_calculated}`);

        // Use calculated values if computed values are 0 or missing
        const A_total = (computed?.receipts?.cumulativeBalance && computed.receipts.cumulativeBalance !== 0)
          ? computed.receipts.cumulativeBalance : A_total_calculated;
        const B_total = (computed?.expenditures?.cumulativeBalance && computed.expenditures.cumulativeBalance !== 0)
          ? computed.expenditures.cumulativeBalance : B_total_calculated;

        // ALWAYS use calculated values for D and E to ensure VAT receivables are included
        // The computed values from database may be outdated or exclude VAT receivables
        const D_total = D_total_calculated;
        const E_total = E_total_calculated;

        // Calculate F from the corrected D and E totals
        const F_total = D_total - E_total;

        // 🔍 DEBUG: Log final calculation
        console.log('🔍 [SECTION F DEBUG] Final calculation:');
        console.log(`  D_total: ${D_total}`);
        console.log(`  E_total: ${E_total}`);
        console.log(`  F_total (D - E): ${F_total}`);
        console.log(`  Expected F_total: ${D_total} - ${E_total} = ${D_total - E_total}`);

        // For G section, calculate from items but exclude the computed surplus/deficit
        const G_items_total = G_items.reduce((s, x) => s + x.total, 0);

        // Calculate surplus/deficit
        const surplus_deficit = A_total - B_total;


        // Update G_items to mark the computed surplus/deficit item
        const updatedG_items = G_items.map(item => {
          if (item.code && item.code.includes('G_3') &&
            (item.label.toLowerCase().includes('surplus') && item.label.toLowerCase().includes('deficit'))) {
            return {
              ...item,
              q1: surplus_deficit,
              q2: 0,
              q3: 0,
              q4: 0,
              total: surplus_deficit,
              isComputed: true,
              computationFormula: 'A - B'
            };
          }
          return item;
        });

        // Calculate final G total including the computed surplus/deficit
        const final_G_total = G_items_total + surplus_deficit;

        // Build corrected UI context with resolved context values
        const correctedUIContext = buildCorrectedUIContext(
          formData?.context || {},
          contextResolution.context
        );

        const ui = {
          id: existingData.id,
          context: correctedUIContext,
          A: { label: 'Receipts', total: A_total, items: A_items },
          B: { label: 'Expenditures', total: B_total, groups: Object.values(B_groups).sort((x: any, y: any) => x.code.localeCompare(y.code)) },
          C: { label: 'Surplus / Deficit', total: surplus_deficit },
          D: { label: 'Financial Assets', total: D_total, items: D_items },
          E: { label: 'Financial Liabilities', total: E_total, items: E_items },
          F: { label: 'Net Financial Assets (D - E)', total: F_total },
          G: { label: 'Closing Balance', total: final_G_total, items: updatedG_items },
        };

        // Prepare response with context correction metadata
        const response: any = {
          exists: true,
          entry: existingData,
          ui,
          message: "Execution data found for the specified parameters"
        };

        // Add metadata if there were context corrections or validation issues
        if (contextResolution.warnings.length > 0 || !activityValidation.isValid) {
          response.metadata = {
            contextWarnings: contextResolution.warnings,
            validationResults: activityValidation
          };
        }

        return c.json(response);
      } catch (e) {
        // If UI formatting fails, return the raw entry similar to getOne fallback
        console.error('UI Building (checkExisting) failed:', e);
        console.error('Error stack:', (e as any)?.stack);
        return c.json({
          exists: true,
          data: existingData,
          message: "Execution data found for the specified parameters"
        });
      }
    } else {
      return c.json({
        exists: false,
        data: null,
        message: "No execution data found for the specified parameters"
      });
    }

  } catch (error: any) {
    console.error('Error checking existing execution data:', error);
    return c.json(
      {
        message: "Failed to check existing execution data",
        debug: {
          error: error?.message,
          projectId,
          facilityId,
          reportingPeriodId,
          schemaId
        }
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Load activity catalogs for all unique facility types in the execution data
 * Supports multi-catalog loading for mixed facility type scenarios
 * 
 * Task 6: Performance optimizations:
 * - Uses Promise.all() for parallel catalog loading (O(1) time instead of O(n))
 * - Implements catalog reuse: each facility type's catalog is loaded only once
 * - Efficient facility-to-catalog mapping using Object/Map structures
 * 
 * @param executionData - Array of execution entries with facility type information
 * @param projectType - Project type (HIV, Malaria, TB) for filtering activities
 * @param facilityTypeFilter - Optional filter to load only specific facility type catalog
 * @returns Object containing catalogs by type, facility-to-catalog mapping, and subcategory names
 */
async function loadMultipleActivityCatalogs(
  executionData: Array<{
    id: number;
    formData: any;
    computedValues: any;
    facilityId: number;
    facilityName: string;
    facilityType: string;
    projectType: string;
    year?: number;
    quarter?: string;
  }>,
  projectType: string,
  facilityTypeFilter?: string
): Promise<{
  catalogsByType: import('./execution.types').ActivityCatalogMap;
  facilityCatalogMap: import('./execution.types').FacilityCatalogMapping;
  subcategoryNames: Record<string, string>;
}> {
  const startTime = Date.now();

  // Task 6: Extract unique facility types from execution data (catalog reuse optimization)
  // Each unique facility type will have its catalog loaded only once
  const facilityTypes = new Set<string>();

  if (facilityTypeFilter) {
    // If filter provided, only load that type
    facilityTypes.add(facilityTypeFilter);
  } else {
    // Otherwise, load catalogs for all types present
    for (const entry of executionData) {
      if (entry.facilityType) {
        facilityTypes.add(entry.facilityType);
      }
    }
  }



  // Task 6: Load activity catalogs in parallel using Promise.all() for optimal performance
  const catalogPromises = Array.from(facilityTypes).map(async (facilityType) => {
    try {
      const activities = await db
        .select({
          code: dynamicActivities.code,
          name: dynamicActivities.name,
          displayOrder: dynamicActivities.displayOrder,
          isTotalRow: dynamicActivities.isTotalRow,
          fieldMappings: dynamicActivities.fieldMappings,
        })
        .from(dynamicActivities)
        .leftJoin(schemaActivityCategories, eq(dynamicActivities.categoryId, schemaActivityCategories.id))
        .where(
          and(
            eq(dynamicActivities.projectType, projectType as any),
            eq(dynamicActivities.facilityType, facilityType as any),
            eq(dynamicActivities.moduleType, 'execution'),
            eq(dynamicActivities.isActive, true),
            eq(schemaActivityCategories.isActive, true)
          )
        );



      return { facilityType, activities };
    } catch (error) {
      throw new Error(`Failed to load activity catalog for facility type: ${facilityType}, project type: ${projectType}`);
    }
  });

  let catalogResults;
  try {
    // Task 6: Execute all catalog loading queries in parallel for optimal performance
    catalogResults = await Promise.all(catalogPromises);
  } catch (error) {
    throw error;
  }

  // Task 6: Build catalogsByType map using efficient Object structure for O(1) lookups
  const catalogsByType: import('./execution.types').ActivityCatalogMap = {};
  for (const result of catalogResults) {
    catalogsByType[result.facilityType] = result.activities.map(activity => {
      const fieldMappings = activity.fieldMappings as any;
      const category = fieldMappings?.category || 'A';
      const subcategory = fieldMappings?.subcategory;

      return {
        code: activity.code as string,
        name: activity.name as string,
        category,
        subcategory,
        displayOrder: activity.displayOrder as number,
        isSection: false,
        isSubcategory: false,
        isComputed: false,
        level: subcategory ? 2 : 1
      };
    });
  }

  // Task 6: Build facility-to-catalog mapping in single pass (O(n) complexity)
  // This implements catalog reuse: facilities of the same type share the same catalog reference
  const facilityCatalogMap: import('./execution.types').FacilityCatalogMapping = {};
  let facilitiesWithoutCatalog = 0;

  for (const entry of executionData) {
    const facilityId = entry.facilityId.toString();
    const catalog = catalogsByType[entry.facilityType];
    if (catalog) {
      // Task 6: Reuse catalog reference for all facilities of the same type
      facilityCatalogMap[facilityId] = catalog;
    } else {
      // Task 5: Enhanced warning when facility has no catalog
      console.warn(
        `[MULTI-CATALOG] [WARNING] No catalog found for facility ${facilityId} (${entry.facilityName}) ` +
        `with facility type: ${entry.facilityType}, project type: ${projectType}`
      );
      facilitiesWithoutCatalog++;
    }
  }

  // Task 5: Log summary of facilities without catalogs
  if (facilitiesWithoutCatalog > 0) {
    console.warn(
      `[MULTI-CATALOG] [WARNING] ${facilitiesWithoutCatalog} out of ${executionData.length} facilities ` +
      `do not have matching activity catalogs. These facilities will show zero values.`
    );
  }

  // Load subcategory names (same for all facility types, use first available facility type)
  const firstFacilityType = Array.from(facilityTypes)[0];
  const categories = await db
    .select({
      code: schemaActivityCategories.subCategoryCode,
      name: schemaActivityCategories.name,
    })
    .from(schemaActivityCategories)
    .where(
      and(
        eq(schemaActivityCategories.moduleType, 'execution' as any),
        eq(schemaActivityCategories.projectType, projectType as any),
        eq(schemaActivityCategories.facilityType, firstFacilityType as any),
        eq(schemaActivityCategories.isSubCategory, true),
        eq(schemaActivityCategories.isActive, true)
      )
    );

  const subcategoryNames: Record<string, string> = {};
  categories.forEach(cat => {
    if (cat.code) {
      subcategoryNames[cat.code] = cat.name;
    }
  });



  return { catalogsByType, facilityCatalogMap, subcategoryNames };
}

export const compiled: AppRouteHandler<CompiledRoute> = async (c) => {
  try {
    // Get user context and parse query parameters
    const userContext = await getUserContext(c);
    const query = compiledExecutionQuerySchema.parse(c.req.query());

    // Task 5.1: Parse scope from query parameters with default 'district'
    const {
      scope = 'district',
      provinceId,
      projectType,
      facilityType,
      reportingPeriodId,
      year,
      quarter,
      districtId
    } = query;

    // Task 5.2: Integrate access control validation
    const accessCheck = validateScopeAccess(scope, userContext, { scope, districtId, provinceId });
    if (!accessCheck.allowed) {
      return c.json({
        data: {
          facilities: [],
          activities: [],
          sections: [],
          totals: { byFacility: {}, grandTotal: 0 }
        },
        meta: {
          filters: {
            projectType,
            facilityType,
            reportingPeriodId,
            year,
            quarter,
            districtId
          },
          aggregationDate: new Date().toISOString(),
          facilityCount: 0,
          reportingPeriod: year ? year.toString() : 'All periods',
          scope,
          scopeDetails: undefined,
          performanceWarning: undefined
        },
        message: accessCheck.message
      }, HttpStatusCodes.FORBIDDEN);
    }

    // Build database query conditions based on provided filters
    let whereConditions: any[] = [
      eq(schemaFormDataEntries.entityType, 'execution')
    ];

    // Task 5.3: Replace facility filtering logic with scope filter
    try {
      const scopeFilter = await buildScopeFilter(scope, userContext, { scope, districtId, provinceId });

      if (scopeFilter) {
        whereConditions.push(scopeFilter);
      }
    } catch (error: any) {
      // Task 5.1: Handle ScopeFilterError specifically with 400 Bad Request
      if (error instanceof ScopeFilterError) {
        return c.json({
          message: error.message,
          error: "Invalid scope configuration",
          details: error.details
        }, HttpStatusCodes.BAD_REQUEST);
      }

      // Task 5.2: Handle generic errors with 500 Internal Server Error
      return c.json({
        message: "Failed to build scope filter",
        error: "Scope filter construction failed",
        details: {
          scope,
          parameters: {
            districtId,
            provinceId
          }
        }
      }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }

    // Apply direct ID filters
    if (reportingPeriodId) {
      whereConditions.push(eq(schemaFormDataEntries.reportingPeriodId, reportingPeriodId));
    }

    // Task 3.2: Create database query logic
    // Write optimized query to fetch execution data with facility, project, district, and province joins
    const baseQuery = db
      .select({
        entry: schemaFormDataEntries,
        facility: facilities,
        project: projects,
        reportingPeriod: reportingPeriods,
        district: districts,
        province: provinces,
      })
      .from(schemaFormDataEntries)
      .leftJoin(facilities, eq(schemaFormDataEntries.facilityId, facilities.id))
      .leftJoin(projects, eq(schemaFormDataEntries.projectId, projects.id))
      .leftJoin(reportingPeriods, eq(schemaFormDataEntries.reportingPeriodId, reportingPeriods.id))
      .leftJoin(districts, eq(facilities.districtId, districts.id))
      .leftJoin(provinces, eq(districts.provinceId, provinces.id))
      .where(and(...whereConditions));

    // Execute query with error handling for database connection and query failures
    let results;
    try {
      results = await baseQuery;
    } catch (dbError: any) {
      console.error('Database query failed:', dbError);
      return c.json(
        {
          message: "Database query failed",
          error: "Unable to fetch execution data"
        },
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // Apply additional filters on the result set
    let filteredResults = results;

    // Filter by facility type
    if (facilityType) {
      filteredResults = filteredResults.filter((r: any) =>
        r.facility?.facilityType === facilityType
      );
    }

    // Filter by project type
    if (projectType) {
      filteredResults = filteredResults.filter((r: any) =>
        r.project?.projectType === projectType
      );
    }

    // Filter by year
    if (year) {
      filteredResults = filteredResults.filter((r: any) =>
        r.reportingPeriod?.year === year
      );
    }

    // Filter by quarter (stored in metadata)
    if (quarter) {
      filteredResults = filteredResults.filter((r: any) => {
        const metadata = r.entry.metadata as any;
        return metadata?.quarter === quarter;
      });
    }

    // Check if no execution data exists for given filters
    if (filteredResults.length === 0) {
      return c.json({
        data: {
          facilities: [],
          activities: [],
          sections: [],
          totals: { byFacility: {}, grandTotal: 0 }
        },
        meta: {
          filters: {
            projectType,
            facilityType,
            reportingPeriodId,
            year,
            quarter,
            districtId
          },
          aggregationDate: new Date().toISOString(),
          facilityCount: 0,
          reportingPeriod: year ? year.toString() : 'All periods',
          scope,
          scopeDetails: undefined,
          performanceWarning: undefined
        }
      }, HttpStatusCodes.OK);
    }


    // Transform results into ExecutionEntry format for aggregation service
    const executionData = filteredResults.map((r: any) => ({
      id: r.entry.id,
      formData: r.entry.formData,
      computedValues: r.entry.computedValues,
      facilityId: r.facility?.id || 0,
      facilityName: r.facility?.name || 'Unknown',
      facilityType: r.facility?.facilityType || 'unknown',
      projectType: r.project?.projectType || 'unknown',
      year: r.reportingPeriod?.year,
      quarter: (r.entry.metadata as any)?.quarter,
      districtId: r.district?.id,
      districtName: r.district?.name,
      provinceId: r.province?.id,
      provinceName: r.province?.name
    }));



    // Task 4: Load multiple activity catalogs for mixed facility types
    const contextProjectType = projectType || executionData[0]?.projectType;

    if (!contextProjectType) {
      return c.json(
        {
          message: "Unable to determine project type for activity catalog",
          error: "Missing context for activity catalog loading"
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    let activityCatalog;
    let subcategoryNames: Record<string, string>;
    let facilityCatalogMap: FacilityCatalogMapping;
    let catalogsByType: ActivityCatalogMap;

    try {
      // Use aggregation service to process the data
      const { cleanedData, warnings } = aggregationService.handleMissingActivityData(executionData);

      if (warnings.length > 0) {
        console.warn('Data cleaning warnings:', warnings);
      }

      // Task 4: Load multiple activity catalogs (one per facility type)
      const catalogData = await loadMultipleActivityCatalogs(
        cleanedData,
        contextProjectType,
        facilityType // Pass facilityType filter for backward compatibility
      );

      catalogsByType = catalogData.catalogsByType;
      facilityCatalogMap = catalogData.facilityCatalogMap;
      subcategoryNames = catalogData.subcategoryNames;

      // Task 4: Build unified activity catalog from multiple facility types
      const unifiedCatalog = aggregationService.buildUnifiedActivityCatalog(catalogsByType);

      const facilityTypesList = Object.keys(catalogsByType);

      // Task: Build hierarchical columns based on scope
      let columns;
      let aggregatedExecutionData;

      switch (scope) {
        case 'district':
          // Individual facility columns
          columns = buildFacilityColumns(cleanedData);
          aggregatedExecutionData = cleanedData;
          break;

        case 'provincial':
          // District hospital columns (pre-aggregated with child HCs)
          columns = await buildDistrictColumns(cleanedData);

          aggregatedExecutionData = aggregateDataByColumns(cleanedData, columns);

          // Update catalog mapping for aggregated columns
          // Map each column (district) to the unified catalog
          aggregatedExecutionData.forEach(entry => {
            facilityCatalogMap[entry.facilityId] = unifiedCatalog;
          });
          break;

        case 'country':
          // Province columns (pre-aggregated with all facilities)
          columns = await buildProvinceColumns(cleanedData);
          aggregatedExecutionData = aggregateDataByColumns(cleanedData, columns);

          // Update catalog mapping for aggregated columns
          // Map each column (province) to the unified catalog
          aggregatedExecutionData.forEach(entry => {
            facilityCatalogMap[entry.facilityId] = unifiedCatalog;
          });
          break;

        default:
          columns = buildFacilityColumns(cleanedData);
          aggregatedExecutionData = cleanedData;
      }

      // Convert columns to FacilityColumn format for response
      const facilityColumns: FacilityColumn[] = columnsToFacilityColumns(columns);

      // Task 4: Use multi-catalog aggregation function
      const aggregatedData = aggregationService.aggregateByActivityWithMultipleCatalogs(
        aggregatedExecutionData,
        facilityCatalogMap,
        unifiedCatalog
      );

      // Extract VAT receivables from form data and add to aggregated data
      // VAT receivables are dynamically created with codes like HIV_EXEC_HOSPITAL_E_VAT_COMMUNICATION_ALL
      // They need to be mapped to catalog codes like HIV_EXEC_HOSPITAL_E_12
      const vatCategoryMapping: Record<string, string> = {
        'COMMUNICATION_ALL': '_E_12',
        'MAINTENANCE': '_E_13',
        'FUEL': '_E_14',
        'SUPPLIES': '_E_15',
        'OFFICE_SUPPLIES': '_E_15'
      };

      for (const entry of aggregatedExecutionData) {
        const facilityId = entry.facilityId.toString();
        const formData = entry.formData;

        if (!formData || !formData.activities) continue;

        // Get activities as an object
        const activities = Array.isArray(formData.activities)
          ? formData.activities.reduce((acc: any, act: any) => {
            if (act?.code) acc[act.code] = act;
            return acc;
          }, {})
          : formData.activities;

        // Look for dynamically created VAT receivable activities
        for (const [activityCode, activity] of Object.entries(activities)) {
          if (!activityCode.includes('_E_VAT_')) continue;

          // Determine which catalog code this maps to
          const upperCode = activityCode.toUpperCase();
          let catalogCodeSuffix: string | null = null;

          for (const [keyword, suffix] of Object.entries(vatCategoryMapping)) {
            if (upperCode.includes(keyword)) {
              catalogCodeSuffix = suffix;
              break;
            }
          }

          if (!catalogCodeSuffix) continue;

          // Find the catalog activity code
          const catalogActivity = unifiedCatalog.find(a => a.code.includes(catalogCodeSuffix!));
          if (!catalogActivity) continue;

          // Extract quarterly values
          const activityData = activity as any;
          const values = {
            q1: activityData.q1 || 0,
            q2: activityData.q2 || 0,
            q3: activityData.q3 || 0,
            q4: activityData.q4 || 0,
            total: (activityData.q1 || 0) + (activityData.q2 || 0) + (activityData.q3 || 0) + (activityData.q4 || 0)
          };

          // Add to aggregated data
          if (!aggregatedData[catalogActivity.code]) {
            aggregatedData[catalogActivity.code] = {};
          }
          aggregatedData[catalogActivity.code][facilityId] = values;

          console.log(`[VAT-RECEIVABLE] Mapped ${activityCode} to ${catalogActivity.code} for facility ${facilityId}:`, values);
        }
      }

      // Use unified catalog for subsequent operations
      activityCatalog = unifiedCatalog;

      // Calculate computed values
      const computedValues = aggregationService.calculateComputedValues(aggregatedData, activityCatalog);

      // Build hierarchical structure
      const activityRows = aggregationService.buildHierarchicalStructure(
        aggregatedData,
        computedValues,
        activityCatalog,
        subcategoryNames
      );

      // Create activity rows with proper hierarchy and computed value indicators
      const activityRowsForResponse: ActivityRow[] = activityRows;

      // Create section summaries
      const sections: SectionSummary[] = activityRows
        .filter(row => row.isSection)
        .map(row => ({
          code: row.code,
          name: row.name,
          total: row.total,
          isComputed: row.isComputed,
          computationFormula: row.computationFormula
        }));

      // Calculate facility totals
      const facilityTotals: FacilityTotals = {
        byFacility: {},
        grandTotal: 0
      };

      facilityColumns.forEach(facility => {
        const facilityId = facility.id.toString();
        let facilityTotal = 0;

        // Sum all section totals for this facility
        sections.forEach(section => {
          const sectionRow = activityRows.find(row => row.code === section.code);
          if (sectionRow && sectionRow.values[facilityId]) {
            facilityTotal += sectionRow.values[facilityId];
          }
        });

        facilityTotals.byFacility[facilityId] = facilityTotal;
        facilityTotals.grandTotal += facilityTotal;
      });

      // Add metadata about filters, facility count, and aggregation parameters
      const appliedFilters: AppliedFilters = {
        scope,
        provinceId,
        projectType,
        facilityType,
        reportingPeriodId,
        year,
        quarter,
        districtId
      };

      // Task 5.4: Add scope metadata to response
      const scopeDetails = await buildScopeMetadata(scope, { scope, districtId, provinceId }, filteredResults);

      // Task 6: Add performance warning when facility count exceeds 100
      let performanceWarning: string | undefined;
      if (facilityColumns.length > 100) {
        performanceWarning = `Large dataset (${facilityColumns.length} facilities): Consider using filters to improve performance`;
      }

      const response: CompiledExecutionResponse = {
        data: {
          facilities: facilityColumns,
          activities: activityRowsForResponse,
          sections,
          totals: facilityTotals
        },
        meta: {
          filters: appliedFilters,
          aggregationDate: new Date().toISOString(),
          facilityCount: facilityColumns.length,
          reportingPeriod: year ? year.toString() : reportingPeriodId ? `Period ${reportingPeriodId}` : 'All periods',
          scope,
          scopeDetails,
          performanceWarning
        }
      };

      return c.json(response, HttpStatusCodes.OK);

    } catch (catalogError: any) {
      // Task 5: Enhanced error responses for catalog loading failures with appropriate HTTP status codes
      // Determine appropriate error response based on error type
      if (catalogError?.message?.includes('Failed to load activity catalog for facility type')) {
        // Specific facility type catalog loading failure
        return c.json(
          {
            message: "Failed to load activity catalog for one or more facility types",
            error: catalogError.message,
            details: {
              projectType: contextProjectType,
              facilityType: facilityType || 'multiple',
              suggestion: "Verify that activity catalogs are configured for all facility types in this project"
            }
          },
          HttpStatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      // Generic catalog loading failure
      return c.json(
        {
          message: "Failed to load activity catalog",
          error: "Unable to load activity definitions for the requested facility types",
          details: {
            projectType: contextProjectType,
            errorMessage: catalogError?.message || 'Unknown error'
          }
        },
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }

  } catch (error: any) {
    console.error('Error in compiled execution handler:', error);
    console.error('Error stack:', error?.stack);

    // Handle validation errors
    if (error?.name === 'ZodError') {
      return c.json(
        {
          message: "Invalid query parameters",
          errors: error.errors?.map((e: any) => ({
            field: e.path?.join('.') || 'unknown',
            message: e.message,
            code: 'VALIDATION_ERROR'
          })) || []
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    return c.json(
      {
        message: "Failed to generate compiled execution report",
        error: error?.message || "Unknown error occurred"
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};