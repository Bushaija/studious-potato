/**
 * Example Usage of Period Lock Validation Middleware
 * 
 * This file demonstrates how to apply the validatePeriodLock middleware
 * to various types of endpoints to prevent editing of locked reporting periods.
 */

import { createRouter } from "@/api/lib/create-app";
import { validatePeriodLock, validatePeriodLockFromBody, validatePeriodLockFromQuery } from "./validate-period-lock";

// Example 1: Apply to planning create endpoint (IDs in request body)
// This is the most common use case for POST/PUT/PATCH endpoints
const planningRouter = createRouter()
  .openapi(
    {
      path: "/planning",
      method: "post",
      // ... route definition
    },
    validatePeriodLockFromBody, // Middleware extracts IDs from request body
    async (c) => {
      // Handler logic - only executes if period is not locked
      const body = await c.req.json();
      // ... create planning logic
    }
  );

// Example 2: Apply to planning update endpoint
const planningUpdateRouter = createRouter()
  .openapi(
    {
      path: "/planning/:id",
      method: "put",
      // ... route definition
    },
    validatePeriodLockFromBody, // Middleware extracts IDs from request body
    async (c) => {
      // Handler logic
      const { id } = c.req.param();
      const body = await c.req.json();
      // ... update planning logic
    }
  );

// Example 3: Apply to execution create endpoint
const executionRouter = createRouter()
  .openapi(
    {
      path: "/execution",
      method: "post",
      // ... route definition
    },
    validatePeriodLockFromBody,
    async (c) => {
      // Handler logic
      const body = await c.req.json();
      // ... create execution logic
    }
  );

// Example 4: Apply to delete endpoint
const deleteRouter = createRouter()
  .openapi(
    {
      path: "/planning/:id",
      method: "delete",
      // ... route definition
    },
    // For delete, we might need to fetch the record first to get the IDs
    // Or pass them as query parameters
    validatePeriodLockFromQuery,
    async (c) => {
      // Handler logic
      const { id } = c.req.param();
      // ... delete planning logic
    }
  );

// Example 5: Custom parameter names
const customRouter = createRouter()
  .openapi(
    {
      path: "/custom-endpoint",
      method: "post",
      // ... route definition
    },
    validatePeriodLock({
      reportingPeriodIdSource: 'body',
      projectIdSource: 'body',
      facilityIdSource: 'body',
      paramNames: {
        reportingPeriodId: 'periodId', // Custom name in request
        projectId: 'proj',              // Custom name in request
        facilityId: 'facility',         // Custom name in request
      }
    }),
    async (c) => {
      // Handler expects: { periodId, proj, facility, ... }
      const body = await c.req.json();
      // ... handler logic
    }
  );

// Example 6: Query parameters (for GET endpoints that modify data)
const queryRouter = createRouter()
  .openapi(
    {
      path: "/data/modify",
      method: "get",
      // ... route definition
    },
    validatePeriodLockFromQuery, // Extracts from query: ?reportingPeriodId=1&projectId=2&facilityId=3
    async (c) => {
      // Handler logic
      const query = c.req.query();
      // ... handler logic
    }
  );

/**
 * Expected Behavior:
 * 
 * 1. If period is NOT locked:
 *    - Middleware passes control to handler
 *    - Handler executes normally
 * 
 * 2. If period IS locked and user is NOT admin:
 *    - Middleware returns 403 Forbidden
 *    - Response: { message: "This reporting period is locked due to an approved financial report. Contact an administrator to unlock." }
 *    - Audit log entry created with action "EDIT_ATTEMPTED"
 * 
 * 3. If period IS locked and user IS admin/superadmin:
 *    - Middleware passes control to handler (admin override)
 *    - Handler executes normally
 *    - Console log indicates admin override was used
 * 
 * 4. If required IDs are missing:
 *    - Middleware logs warning and passes control to handler
 *    - Handler should validate and return appropriate error
 * 
 * 5. If user is not authenticated:
 *    - Middleware returns 401 Unauthorized
 *    - Response: { message: "Authentication required" }
 */

/**
 * Integration with Existing Routes:
 * 
 * To integrate with existing planning/execution routes:
 * 
 * 1. Import the middleware:
 *    import { validatePeriodLockFromBody } from "@/middlewares/validate-period-lock";
 * 
 * 2. Add to route registration:
 *    .openapi(routes.create, validatePeriodLockFromBody, handlers.create)
 * 
 * 3. Ensure auth middleware runs first:
 *    The middleware requires user context from c.get('user')
 *    Make sure requireAuth or getSessionMiddleware runs before this middleware
 */
