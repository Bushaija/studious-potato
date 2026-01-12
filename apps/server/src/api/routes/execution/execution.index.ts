import { createRouter } from "@/api/lib/create-app";
import { periodLockService } from "@/lib/services/period-lock-service";
import { HTTPException } from "hono/http-exception";
import * as handlers from "./execution.handlers";
import * as routes from "./execution.routes";

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
  .openapi(routes.getFormSchema, handlers.getFormSchema)
  .openapi(routes.checkExisting, handlers.checkExisting)
  .openapi(routes.getActivities, handlers.getActivities)
  .openapi(routes.quarterlySummary, handlers.quarterlySummary)
  .openapi(routes.compiled, handlers.compiled)
  // .openapi(routes.compiledExport, handlers.compiledExport)
  .openapi(routes.list, handlers.list)
  .openapi(routes.getOne, handlers.getOne)
  // Note: create and update handlers already include approval validation logic
  // Period lock middleware added to prevent back-dating of approved periods
  .openapi(routes.create, withPeriodLockValidation(handlers.create))
  .openapi(routes.update, withPeriodLockValidation(handlers.update))
  .openapi(routes.remove, withPeriodLockValidation(handlers.remove))
  
  .openapi(routes.calculateBalances, handlers.calculateBalances)
  .openapi(routes.validateAccountingEquation, handlers.validateAccountingEquation)

export default router;