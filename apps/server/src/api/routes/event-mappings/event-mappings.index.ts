import { createRouter } from "@/api/lib/create-app";

import * as handlers from "./event-mappings.handlers";
import * as routes from "./event-mappings.routes";

const router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.create, handlers.create)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.bulkUpdate, handlers.bulkUpdate)
  .openapi(routes.validateMapping, handlers.validateMapping)
  .openapi(routes.getTemplate, handlers.getTemplate);

export default router;