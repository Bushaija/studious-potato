import { createRoute, z } from "@hono/zod-openapi"
import * as HttpStatusCodes from "stoker/http-status-codes"
import { jsonContent } from "stoker/openapi/helpers"

const tags = ["dashboard"]

// Scope enum - organizational levels
const scopeSchema = z.enum(['country', 'province', 'district', 'facility'])

// Project type enum - health programs
const projectTypeSchema = z.enum(['HIV', 'Malaria', 'TB'])

// Error schema
const errorSchema = z.object({
  message: z.string(),
})

// Component result schema (can be data or error)
const componentResultSchema = z.union([
  z.object({
    data: z.any(),
  }),
  z.object({
    error: z.literal(true),
    message: z.string(),
  }),
])

// Unified dashboard route
export const getUnifiedDashboard = createRoute({
  path: "/dashboard",
  method: "get",
  tags,
  request: {
    query: z.object({
      components: z.string().describe("Comma-separated list of components to fetch (e.g., 'metrics,programDistribution,tasks')"),
      scope: scopeSchema.optional().describe("Organizational scope level (country, province, district, facility)"),
      scopeId: z.string().optional().describe("ID of the scope entity (required if scope is specified)"),
      projectType: projectTypeSchema.optional().describe("Project type filter - filters data by health program (HIV, Malaria, or TB)"),
      periodId: z.string().optional().describe("Reporting period ID (defaults to active period if not provided)"),
      quarter: z.string().optional().describe("Quarter filter (1-4) - filters data by quarter"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.record(z.string(), componentResultSchema),
      "Dashboard component data - each key is a component name, value is either data or error"
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

export type GetUnifiedDashboardRoute = typeof getUnifiedDashboard
