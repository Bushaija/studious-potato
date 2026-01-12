import { createRouter } from "@/api/lib/create-app";

import * as handlers from "./schemas.handlers";
import * as routes from "./schemas.routes";

const router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.activate, handlers.activate)
  .openapi(routes.deactivate, handlers.deactivate);

export default router;