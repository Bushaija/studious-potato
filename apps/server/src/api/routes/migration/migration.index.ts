import { createRouter } from "@/api/lib/create-app";

import * as handlers from "./migration.handlers";
import * as routes from "./migration.routes";

const router = createRouter()
  .openapi(routes.normalizeLegacyReports, handlers.normalizeLegacyReports)
  .openapi(routes.validateMigration, handlers.validateMigration)
  .openapi(routes.getMigrationStatus, handlers.getMigrationStatus)
  .openapi(routes.migrateSchema, handlers.migrateSchema)
  .openapi(routes.bulkImport, handlers.bulkImport)
  .openapi(routes.getMigrationHistory, handlers.getMigrationHistory)
  .openapi(routes.cancelMigration, handlers.cancelMigration)
  .openapi(routes.rollbackMigration, handlers.rollbackMigration)
  .openapi(routes.transformData, handlers.transformData)
  .openapi(routes.dryRunMigration, handlers.dryRunMigration);

export default router;