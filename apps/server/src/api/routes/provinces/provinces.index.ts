import { createRouter } from "@/api/lib/create-app";

import * as handlers from "./provinces.handlers";
import * as routes from "./provinces.routes";

const router = createRouter()
    .openapi(routes.list, handlers.list)
    // parametric routes
    .openapi(routes.getOne, handlers.getOne);
    // .openapi(routes.create, handlers.create)
    // .openapi(routes.update, handlers.update)
    // .openapi(routes.remove, handlers.remove);

export default router;