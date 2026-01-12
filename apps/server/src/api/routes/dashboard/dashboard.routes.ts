import { createRoute, z } from "@hono/zod-openapi"
import * as HttpStatusCodes from "stoker/http-status-codes"
import { jsonContent } from "stoker/openapi/helpers"

const tags = ["dashboard"]

const errorSchema = z.object({
  message: z.string(),
})

// Accountant Facility Overview Response
const facilityOverviewSchema = z.object({
  currentReportingPeriod: z.object({
    id: z.number(),
    year: z.number(),
    periodType: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    status: z.string(),
  }).nullable(),
  facility: z.object({
    id: z.number(),
    name: z.string(),
    facilityType: z.string(),
  }),
  budgetSummary: z.object({
    totalAllocated: z.number(),
    totalSpent: z.number(),
    totalRemaining: z.number(),
    utilizationPercentage: z.number(),
  }),
  projectBreakdown: z.array(z.object({
    projectId: z.number(),
    projectName: z.string(),
    projectCode: z.string(),
    allocated: z.number(),
    spent: z.number(),
    remaining: z.number(),
    utilizationPercentage: z.number(),
  })),
})

// Accountant Tasks Response
const tasksSchema = z.object({
  pendingPlans: z.array(z.object({
    projectId: z.number(),
    projectName: z.string(),
    projectCode: z.string(),
    reportingPeriodId: z.number(),
    reportingPeriodYear: z.number(),
    deadline: z.string().nullable(),
    status: z.string(),
  })),
  pendingExecutions: z.array(z.object({
    projectId: z.number(),
    projectName: z.string(),
    projectCode: z.string(),
    reportingPeriodId: z.number(),
    reportingPeriodYear: z.number(),
    quarter: z.number().nullable(),
    deadline: z.string().nullable(),
    status: z.string(),
  })),
  correctionsRequired: z.array(z.object({
    id: z.number(),
    entityType: z.enum(['planning', 'execution']),
    projectId: z.number(),
    projectName: z.string(),
    projectCode: z.string(),
    reportingPeriodId: z.number(),
    reportingPeriodYear: z.number(),
    quarter: z.number().nullable(),
    feedback: z.string().nullable(),
    updatedAt: z.string(),
  })),
  upcomingDeadlines: z.array(z.object({
    reportingPeriodId: z.number(),
    year: z.number(),
    periodType: z.string(),
    endDate: z.string(),
    daysRemaining: z.number(),
  })),
})

// Accountant Facility Overview Route
export const getAccountantFacilityOverview = createRoute({
  path: "/dashboard/accountant/facility-overview",
  method: "get",
  tags,
  request: {
    query: z.object({
      facilityId: z.string().optional().describe("Optional facility ID to filter data. If not provided, uses user's facility and accessible facilities based on district."),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      facilityOverviewSchema,
      "Facility overview data"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      errorSchema,
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions"
    ),
  },
})

// Accountant Tasks Route
export const getAccountantTasks = createRoute({
  path: "/dashboard/accountant/tasks",
  method: "get",
  tags,
  request: {
    query: z.object({
      facilityId: z.string().optional().describe("Optional facility ID to filter tasks. If not provided, shows tasks for user's facility and accessible facilities based on district."),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      tasksSchema,
      "Tasks and deadlines data"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      errorSchema,
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions"
    ),
  },
})

// Dashboard Metrics Route
export const getDashboardMetrics = createRoute({
  path: "/dashboard/metrics",
  method: "get",
  tags,
  request: {
    query: z.object({
      level: z.enum(['province', 'district']).describe("Aggregation level: province or district"),
      provinceId: z.string().optional().describe("Province ID (required when level=province)"),
      districtId: z.string().optional().describe("District ID (required when level=district)"),
      projectType: z.enum(['HIV', 'Malaria', 'TB']).optional().describe("Optional project type to filter by program"),
      quarter: z.string().optional().describe("Optional quarter (1-4) to filter by quarter"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        totalAllocated: z.number().describe("Total allocated budget amount"),
        totalSpent: z.number().describe("Total spent budget amount"),
        remaining: z.number().describe("Remaining budget amount"),
        utilizationPercentage: z.number().describe("Budget utilization percentage (0-100)"),
        reportingPeriod: z.object({
          id: z.number(),
          year: z.number(),
          periodType: z.string(),
          startDate: z.string(),
          endDate: z.string(),
        }).nullable().describe("Current active reporting period"),
      }),
      "Dashboard metrics data"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      errorSchema,
      "Invalid request parameters"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      errorSchema,
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions"
    ),
  },
})

// Program Distribution Route
export const getProgramDistribution = createRoute({
  path: "/dashboard/program-distribution",
  method: "get",
  tags,
  request: {
    query: z.object({
      level: z.enum(['province', 'district']).describe("Aggregation level: province or district"),
      provinceId: z.string().optional().describe("Province ID (optional when level=province)"),
      districtId: z.string().optional().describe("District ID (optional when level=district)"),
      quarter: z.string().optional().describe("Optional quarter (1-4) to filter by quarter"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        programs: z.array(z.object({
          programId: z.number().describe("Program ID"),
          programName: z.string().describe("Program name"),
          allocatedBudget: z.number().describe("Total allocated budget for this program"),
          percentage: z.number().describe("Percentage of total budget (0-100)"),
        })),
        total: z.number().describe("Total allocated budget across all programs"),
      }),
      "Program budget distribution data"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      errorSchema,
      "Invalid request parameters"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      errorSchema,
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions"
    ),
  },
})

// Budget by District Route
export const getBudgetByDistrict = createRoute({
  path: "/dashboard/budget-by-district",
  method: "get",
  tags,
  request: {
    query: z.object({
      provinceId: z.string().describe("Province ID (required)"),
      projectType: z.enum(['HIV', 'Malaria', 'TB']).optional().describe("Optional project type to filter by program"),
      quarter: z.string().optional().describe("Optional quarter (1-4) to filter by quarter"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        districts: z.array(z.object({
          districtId: z.number().describe("District ID"),
          districtName: z.string().describe("District name"),
          allocatedBudget: z.number().describe("Total allocated budget for this district"),
          spentBudget: z.number().describe("Total spent budget for this district"),
          utilizationPercentage: z.number().describe("Budget utilization percentage (0-100)"),
        })),
      }),
      "Budget by district data"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      errorSchema,
      "Invalid request parameters"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      errorSchema,
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions"
    ),
  },
})

// Budget by Facility Route
export const getBudgetByFacility = createRoute({
  path: "/dashboard/budget-by-facility",
  method: "get",
  tags,
  request: {
    query: z.object({
      districtId: z.string().optional().describe("District ID (optional, use either districtId or facilityId)"),
      facilityId: z.string().optional().describe("Facility ID (optional, use either districtId or facilityId). When provided, returns data for this facility and its child health centers only."),
      projectType: z.enum(['HIV', 'Malaria', 'TB']).optional().describe("Optional project type to filter by program"),
      quarter: z.string().optional().describe("Optional quarter (1-4) to filter by quarter"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        facilities: z.array(z.object({
          facilityId: z.number().describe("Facility ID"),
          facilityName: z.string().describe("Facility name"),
          facilityType: z.string().describe("Facility type (e.g., hospital, health center)"),
          allocatedBudget: z.number().describe("Total allocated budget for this facility"),
          spentBudget: z.number().describe("Total spent budget for this facility"),
          utilizationPercentage: z.number().describe("Budget utilization percentage (0-100)"),
        })),
      }),
      "Budget by facility data"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      errorSchema,
      "Invalid request parameters"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      errorSchema,
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions"
    ),
  },
})

// Province Approval Summary Route
export const getProvinceApprovalSummary = createRoute({
  path: "/dashboard/approved-budgets/province",
  method: "get",
  tags,
  request: {
    query: z.object({
      provinceId: z.string().describe("Province ID (required)"),
      projectType: z.enum(['HIV', 'Malaria', 'TB']).optional().describe("Optional project type to filter by program"),
      quarter: z.string().optional().describe("Optional quarter (1-4) to filter by quarter"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        districts: z.array(z.object({
          districtId: z.number().describe("District ID"),
          districtName: z.string().describe("District name"),
          allocatedBudget: z.number().describe("Total allocated budget for this district"),
          approvedCount: z.number().describe("Number of approved budget plans"),
          rejectedCount: z.number().describe("Number of rejected budget plans"),
          pendingCount: z.number().describe("Number of pending budget plans"),
          totalCount: z.number().describe("Total number of budget plans"),
          approvalRate: z.number().describe("Approval rate percentage (0-100)"),
        })),
      }),
      "Province approval summary data"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      errorSchema,
      "Invalid request parameters"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      errorSchema,
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions"
    ),
  },
})

// District Approval Details Route
export const getDistrictApprovalDetails = createRoute({
  path: "/dashboard/approved-budgets/district",
  method: "get",
  tags,
  request: {
    query: z.object({
      districtId: z.string().optional().describe("District ID (optional, use either districtId or facilityId)"),
      facilityId: z.string().optional().describe("Facility ID (optional, use either districtId or facilityId). When provided, returns data for this facility and its child health centers only."),
      projectType: z.enum(['HIV', 'Malaria', 'TB']).optional().describe("Optional project type to filter by program"),
      quarter: z.string().optional().describe("Optional quarter (1-4) to filter by quarter"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        facilities: z.array(z.object({
          facilityId: z.number().describe("Facility ID"),
          facilityName: z.string().describe("Facility name"),
          projectId: z.number().describe("Project ID"),
          projectName: z.string().describe("Project name"),
          projectCode: z.string().describe("Project code"),
          allocatedBudget: z.number().describe("Allocated budget for this project"),
          approvalStatus: z.enum(['APPROVED', 'PENDING', 'REJECTED']).describe("Approval status"),
          approvedBy: z.string().nullable().describe("Username of the reviewer who approved/rejected"),
          approvedAt: z.string().nullable().describe("ISO 8601 timestamp of approval/rejection"),
          quarter: z.number().nullable().describe("Quarter number (1-4)"),
        })),
      }),
      "District approval details data"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      errorSchema,
      "Invalid request parameters"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      errorSchema,
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions"
    ),
  },
})

// Export route types for handlers
export type GetAccountantFacilityOverviewRoute = typeof getAccountantFacilityOverview
export type GetAccountantTasksRoute = typeof getAccountantTasks
export type GetDashboardMetricsRoute = typeof getDashboardMetrics
export type GetProgramDistributionRoute = typeof getProgramDistribution
export type GetBudgetByDistrictRoute = typeof getBudgetByDistrict
export type GetBudgetByFacilityRoute = typeof getBudgetByFacility
export type GetProvinceApprovalSummaryRoute = typeof getProvinceApprovalSummary
export type GetDistrictApprovalDetailsRoute = typeof getDistrictApprovalDetails
