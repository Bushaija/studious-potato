import { HTTPException } from 'hono/http-exception'
import * as HttpStatusCodes from "stoker/http-status-codes"
import type { AppRouteHandler } from "@/api/lib/types"
import { getUserContext } from '@/lib/utils/get-user-facility'
import type { GetUnifiedDashboardRoute } from "./unified-dashboard.routes"
import { DashboardService } from '../../services/dashboard/unified-dashboard.service'

/**
 * Unified Dashboard Handler
 * 
 * Handles requests to the unified dashboard endpoint.
 * Validates query parameters, retrieves user context, and orchestrates
 * parallel component fetching through the DashboardService.
 */
export const getUnifiedDashboard: AppRouteHandler<GetUnifiedDashboardRoute> = async (c) => {
  try {
    // Get user context (authentication and authorization)
    const userContext = await getUserContext(c)
    
    // Parse query parameters
    const {
      components: componentsStr,
      scope,
      scopeId: scopeIdStr,
      projectType: projectTypeStr,
      periodId: periodIdStr,
      quarter: quarterStr,
    } = c.req.query()
    
    // Validate components parameter is required
    if (!componentsStr) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, { 
        message: 'components parameter is required' 
      })
    }
    
    // Parse components from comma-separated string
    const components = componentsStr.split(',').map(c => c.trim()).filter(Boolean)
    
    // Validate at least one component is requested
    if (components.length === 0) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, { 
        message: 'At least one component must be specified' 
      })
    }
    
    // Build filters object from query parameters
    const filters = {
      scope: scope as any,
      scopeId: scopeIdStr ? parseInt(scopeIdStr) : undefined,
      projectType: projectTypeStr,
      periodId: periodIdStr ? parseInt(periodIdStr) : undefined,
      quarter: quarterStr ? parseInt(quarterStr) : undefined,
    }
    
    // Validate scope requires scopeId
    if (filters.scope && !filters.scopeId) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, { 
        message: 'scopeId is required when scope is specified' 
      })
    }
    
    // Validate quarter range (1-4)
    if (filters.quarter !== undefined) {
      if (isNaN(filters.quarter) || filters.quarter < 1 || filters.quarter > 4) {
        throw new HTTPException(HttpStatusCodes.BAD_REQUEST, { 
          message: 'quarter must be between 1 and 4' 
        })
      }
    }
    
    // Validate numeric parameters
    if (filters.scopeId !== undefined && isNaN(filters.scopeId)) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, { 
        message: 'scopeId must be a valid number' 
      })
    }
    
    if (filters.periodId !== undefined && isNaN(filters.periodId)) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, { 
        message: 'periodId must be a valid number' 
      })
    }
    
    // Log request for monitoring
    console.log('Unified dashboard request:', {
      userId: userContext.userId,
      components,
      filters,
      timestamp: new Date().toISOString(),
    })
    
    // Execute dashboard service to fetch all components in parallel
    const dashboardService = new DashboardService()
    const results = await dashboardService.getDashboardData(
      filters,
      components,
      userContext
    )
    
    // Return JSON response with component results
    return c.json(results, HttpStatusCodes.OK)
    
  } catch (error: any) {
    console.error('Unified dashboard error:', error)
    
    // Re-throw HTTPException errors
    if (error instanceof HTTPException) {
      throw error
    }
    
    // Handle specific error types
    if (error.message?.includes('Access denied') || error.message?.includes('Insufficient permissions')) {
      throw new HTTPException(HttpStatusCodes.FORBIDDEN, { 
        message: error.message 
      })
    }
    
    if (error.message?.includes('No active reporting period')) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, { 
        message: 'No active reporting period found. Please specify a periodId or ensure an active period exists.' 
      })
    }
    
    // Generic server error
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, { 
      message: 'Failed to retrieve dashboard data' 
    })
  }
}
