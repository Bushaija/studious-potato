import { createRouter } from "@/api/lib/create-app";

import * as handlers from "./computation.handlers";
import * as routes from "./computation.routes";

const router = createRouter()
  .openapi(routes.calculateValues, handlers.calculateValues)
  .openapi(routes.aggregateTotals, handlers.aggregateTotals)
  .openapi(routes.varianceAnalysis, handlers.varianceAnalysis)
  .openapi(routes.validateFormula, handlers.validateFormula)
  .openapi(routes.calculateFinancialRatios, handlers.calculateFinancialRatios)
  .openapi(routes.optimizeFormulas, handlers.optimizeFormulas);

export default router;