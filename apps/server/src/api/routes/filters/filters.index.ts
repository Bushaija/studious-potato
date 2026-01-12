import { createRouter } from "@/api/lib/create-app";

import * as handlers from "./filters.handlers";
import * as routes from "./filters.routes";

const router = createRouter()
  .openapi(routes.getFacilities, handlers.getFacilities)
  .openapi(routes.createFacilitiesPlanning, handlers.createFacilitiesPlanning);

export default router;


