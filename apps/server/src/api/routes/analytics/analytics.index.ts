import { createRouter } from "@/api/lib/create-app";

import * as handlers from "./analytics.handlers";
import * as routes from "./analytics.routes";

const router = createRouter()
  .openapi(routes.getBudgetExecutionRates, handlers.getBudgetExecutionRates)

export default router;