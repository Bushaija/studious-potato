import { createRouter } from "@/api/lib/create-app";

import * as handlers from "./districts.handlers";
import * as routes from "./districts.routes";

const router = createRouter()
    .openapi(routes.list, handlers.list)
    .openapi(routes.getOne, handlers.getOne);

export default router;
