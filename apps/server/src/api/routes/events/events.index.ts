import { createRouter } from "@/api/lib/create-app";
import * as handlers from "./events.handlers";
import * as routes from "./events.routes";

const router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.create, handlers.create)
  .openapi(routes.update, handlers.update)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove);

export default router;