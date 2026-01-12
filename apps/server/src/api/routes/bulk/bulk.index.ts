import { createRouter } from "@/api/lib/create-app";

import * as handlers from "./bulk.handlers";
import * as routes from "./bulk.routes";

const router = createRouter()
  .openapi(routes.exportSingleReport, handlers.exportSingleReport)
  .openapi(routes.bulkExport, handlers.bulkExport)
  .openapi(routes.getExportStatus, handlers.getExportStatus)
  .openapi(routes.downloadExport, handlers.downloadExport)
  .openapi(routes.cancelExport, handlers.cancelExport)
  .openapi(routes.migrationExport, handlers.migrationExport)
  .openapi(routes.listExportTemplates, handlers.listExportTemplates)
  .openapi(routes.createExportTemplate, handlers.createExportTemplate)
  .openapi(routes.getExportTemplate, handlers.getExportTemplate)
  .openapi(routes.updateExportTemplate, handlers.updateExportTemplate)
  .openapi(routes.deleteExportTemplate, handlers.deleteExportTemplate);

export default router;