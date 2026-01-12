import { createRouter } from "@/api/lib/create-app";

import * as handlers from "./financial-reports.handlers";
import * as routes from "./financial-reports.routes";
import { createReportFromStatement } from "./create-report-from-statement.handler";
import { getDafQueue, getDgQueue } from "./approval-queue.handlers";

const router = createRouter()
  .openapi(routes.list, handlers.list)
  // Register specific routes BEFORE parameterized routes to avoid conflicts
  .openapi(routes.generateStatement, handlers.generateStatement)
  .openapi(routes.createReportFromStatement, createReportFromStatement)
  .openapi(routes.exportStatement, handlers.exportStatement)
  .openapi(routes.generatePdf, handlers.generatePdf)
  // Approval queue routes (non-parameterized)
  .openapi(routes.getDafQueue, getDafQueue)
  .openapi(routes.getDgQueue, getDgQueue)
  // Period lock routes (non-parameterized)
  .openapi(routes.getPeriodLocks, handlers.getPeriodLocks)
  // Now register parameterized routes
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove)
  // Approval workflow routes (also parameterized, but more specific)
  .openapi(routes.submitForApproval, handlers.submitForApproval)
  .openapi(routes.dafApprove, handlers.dafApprove)
  .openapi(routes.dafReject, handlers.dafReject)
  .openapi(routes.dgApprove, handlers.dgApprove)
  .openapi(routes.dgReject, handlers.dgReject)
  .openapi(routes.getWorkflowLogs, handlers.getWorkflowLogs)
  // Period lock parameterized routes
  .openapi(routes.unlockPeriod, handlers.unlockPeriod)
  .openapi(routes.getPeriodLockAudit, handlers.getPeriodLockAudit)
  // Version control routes
  .openapi(routes.getVersions, handlers.getVersions)
  .openapi(routes.getVersion, handlers.getVersion)
  .openapi(routes.compareVersions, handlers.compareVersions);

export default router;