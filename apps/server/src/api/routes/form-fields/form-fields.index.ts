import { createRouter } from "@/api/lib/create-app";

import * as handlers from "./form-fields.handlers";
import * as routes from "./form-fields.routes";

const router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.bulkCreate, handlers.bulkCreate)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.update, handlers.update)
  .openapi(routes.bulkUpdate, handlers.bulkUpdate)
  .openapi(routes.reorder, handlers.reorder)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.getBySchema, handlers.getBySchema);

export default router;