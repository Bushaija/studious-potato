import { createRouter } from "@/api/lib/create-app";

import * as handlers from "./activities.handlers";
import * as routes from "./activities.routes";

const router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.bulkCreate, handlers.bulkCreate)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.reorder, handlers.reorder)
  .openapi(routes.getByCategory, handlers.getByCategory);

export default router;