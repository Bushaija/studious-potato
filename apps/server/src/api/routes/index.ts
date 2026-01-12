import createRouter from "@/api/lib/create-app";
import type { AppOpenAPI } from "@/api/lib/types";

import admin from "@/api/api/routes/admin/admin.index";
import analytics from "@/api/api/routes/analytics/analytics.index"
import activities from "@/api/api/routes/activities/activities.index"
import auth from "@/api/api/routes/accounts/auth.index"
import bulk from "@/api/api/routes/bulk/bulk.index"
import categories from "@/api/api/routes/categories/categories.index"
import computation from "@/api/api/routes/computation/computation.index"
// import configurations from "@/api/api/routes/configurations/configurations.index"
import dashboard from "@/api/api/routes/dashboard/dashboard.index"
import districts from "@/api/api/routes/districts/districts.index"
import documents from "@/api/api/routes/documents/documents.index"
import eventMappings from "@/api/api/routes/event-mappings/event-mappings.index"
import events from "@/api/api/routes/events/events.index"
import execution from "@/api/api/routes/execution/execution.index"
import facilities from "@/api/api/routes/facilities/facilities.index"
import financialReports from "@/api/api/routes/financial-reports/financial-reports.index"
import formFields from "@/api/api/routes/form-fields/form-fields.index"
import migration from "@/api/api/routes/migration/migration.index"
import planning from "@/api/api/routes/planning/planning.index"
import configuration from "@/api/api/routes/filters/filters.index"
import projects from "@/api/api/routes/projects/projects.index"
import provinces from "@/api/api/routes/provinces/provinces.index"
import reportingPeriods from "@/api/api/routes/reporting-periods/reporting-periods.index"
import schemas from "@/api/api/routes/schemas/schemas.index"
import statementTemplates from "@/api/api/routes/statement-templates/statement-templates.index"
// import configuration from "@/api/api/routes/configuration/configuration.index"
import statements from "@/api/api/routes/statements/statements.index"
import validation from "@/api/api/routes/validation/validations.index"

export function registerRoutes(app: AppOpenAPI) {
    return app
      .route("/", auth)
      .route("/", admin)
      .route("/", analytics)
      .route("/", computation)
      .route("/", dashboard)
      .route("/", districts)
      .route("/", documents)
      .route("/", eventMappings)
      .route("/", events)
      .route("/", execution)

      // Register configuration before planning to avoid "/planning/{id}" catching it
      .route("/", configuration)

      .route("/", facilities)
      .route("/", migration)
      .route("/", planning)
      .route("/", provinces)
      .route("/", reportingPeriods)
      .route("/", activities)
      .route("/", bulk) 
      .route("/", categories)
      .route("/", financialReports)
      .route("/", formFields)
      .route("/", projects)
      .route("/", schemas) 
      .route("/", statements) 
      .route("/", validation) 
      .route("/", statementTemplates) // fix errors
      // .route("/", auth) // fix errors social providers missing
  };
  
  
  export const router = registerRoutes(
    createRouter()
  );
  
  export type router = typeof router;