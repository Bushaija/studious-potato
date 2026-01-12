import { createRouter } from "@/api/lib/create-app";

import * as handlers from "./statements.handlers";
import * as routes from "./statements.routes";

const router = createRouter()
  .openapi(routes.submitReport, handlers.submitReport)
  .openapi(routes.approveReport, handlers.approveReport)
  .openapi(routes.rejectReport, handlers.rejectReport)
  .openapi(routes.requestChanges, handlers.requestChanges)
  .openapi(routes.recallReport, handlers.recallReport)
  .openapi(routes.getWorkflowHistory, handlers.getWorkflowHistory)
  .openapi(routes.bulkApproval, handlers.bulkApproval)
  .openapi(routes.getApprovalQueue, handlers.getApprovalQueue)
  .openapi(routes.getNotificationPreferences, handlers.getNotificationPreferences)
  .openapi(routes.updateNotificationPreferences, handlers.updateNotificationPreferences);

export default router;