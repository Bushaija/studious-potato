import { createRouter } from "@/api/lib/create-app";
import { periodLockService } from "@/lib/services/period-lock-service";
import { HTTPException } from "hono/http-exception";

import * as handlers from "./planning.handlers";
import * as routes from "./planning.routes";

// Wrapper function to apply period lock validation to handlers
function withPeriodLockValidation<T extends (...args: any[]) => any>(handler: T): T {
  return (async (c: any) => {
    try {
      // Get user from context
      const user = c.get('user');
      
      if (!user || !user.id) {
        throw new HTTPException(401, {
          message: 'Authentication required',
        });
      }

      // Extract IDs from request body
      const body = await c.req.json();
      const reportingPeriodId = body.reportingPeriodId ? parseInt(body.reportingPeriodId) : undefined;
      const projectId = body.projectId ? parseInt(body.projectId) : undefined;
      const facilityId = body.facilityId ? parseInt(body.facilityId) : undefined;

      // Validate period lock if all IDs are present
      if (reportingPeriodId && projectId && facilityId) {
        const userId = parseInt(user.id);
        const validationResult = await periodLockService.validateEditOperation(
          reportingPeriodId,
          projectId,
          facilityId,
          userId
        );

        if (!validationResult.allowed) {
          throw new HTTPException(403, {
            message: validationResult.reason || 'This reporting period is locked',
          });
        }
      }

      // Call the original handler
      return await handler(c);
    } catch (error) {
      // Re-throw HTTPException as-is
      if (error instanceof HTTPException) {
        throw error;
      }
      throw error;
    }
  }) as T;
}

const router = createRouter()
  // Static paths first to prevent route collisions
  .openapi(routes.getFormSchema, handlers.getFormSchema)
  .openapi(routes.getActivities, handlers.getActivities)
  .openapi(routes.getDataSummary, handlers.getDataSummary)
  
  // NEW: File upload and template download
  .openapi(routes.uploadFile, withPeriodLockValidation(handlers.uploadFile))
  .openapi(routes.downloadTemplate, handlers.downloadTemplate)
  
  // NEW: Approval workflow routes
  .openapi(routes.submitForApproval, handlers.submitForApproval)
  .openapi(routes.approvePlanning, handlers.approvePlanning)
  .openapi(routes.reviewPlanning, handlers.reviewPlanning)
  .openapi(routes.bulkReviewPlanning, handlers.bulkReviewPlanning)
  
  // Existing routes
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, withPeriodLockValidation(handlers.create))
  .openapi(routes.calculateTotals, handlers.calculateTotals)
  .openapi(routes.validate, handlers.validate)
  
  // Dynamic :id routes last
  .openapi(routes.getApprovalHistory, handlers.getApprovalHistory)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.update, withPeriodLockValidation(handlers.update))
  .openapi(routes.remove, withPeriodLockValidation(handlers.remove));

export default router;