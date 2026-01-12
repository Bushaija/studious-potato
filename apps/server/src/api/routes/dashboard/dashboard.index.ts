import { createRouter } from "@/api/lib/create-app"
import * as handlers from "./dashboard.handlers"
import * as routes from "./dashboard.routes"
import * as unifiedHandlers from "./unified-dashboard.handlers"
import * as unifiedRoutes from "./unified-dashboard.routes"

const router = createRouter()
  // Unified dashboard endpoint (new)
  .openapi(unifiedRoutes.getUnifiedDashboard, unifiedHandlers.getUnifiedDashboard)
  // Legacy endpoints (deprecated)
  .openapi(routes.getAccountantFacilityOverview, handlers.getAccountantFacilityOverview)
  .openapi(routes.getAccountantTasks, handlers.getAccountantTasks)
  .openapi(routes.getDashboardMetrics, handlers.getDashboardMetrics)
  .openapi(routes.getProgramDistribution, handlers.getProgramDistribution)
  .openapi(routes.getBudgetByDistrict, handlers.getBudgetByDistrict)
  .openapi(routes.getBudgetByFacility, handlers.getBudgetByFacility)
  .openapi(routes.getProvinceApprovalSummary, handlers.getProvinceApprovalSummary)
  .openapi(routes.getDistrictApprovalDetails, handlers.getDistrictApprovalDetails)

export default router;

