import { createRouter } from "@/api/lib/create-app";

import * as handlers from "./reporting-periods.handlers";
import * as routes from "./reporting-periods.routes";

const router = createRouter()
  .openapi(routes.getCurrentPeriod, handlers.getCurrentPeriod)
  .openapi(routes.getStats, handlers.getStats)
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.getByYear, handlers.getByYear);

export default router;