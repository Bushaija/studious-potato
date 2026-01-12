import { createRouter } from "@/api/lib/create-app";

import * as handlers from "./facilities.handlers";
import * as routes from "./facilities.routes";

const router = createRouter()
    .openapi(routes.list, handlers.list)
    .openapi(routes.getByDistrict, handlers.getByDistrict)
    .openapi(routes.getByName, handlers.getByName) // keept this BEFORE getOne
    .openapi(routes.getPlanned, handlers.getPlanned)
    .openapi(routes.getExecution, handlers.getExecution)
    .openapi(routes.getAll, handlers.getAll)
    .openapi(routes.getAccessible, handlers.getAccessible)
    .openapi(routes.getOne, handlers.getOne)
    .openapi(routes.getHierarchy, handlers.getHierarchy);
        // .openapi(routes.create, handlers.create)
        // .openapi(routes.update, handlers.update)
        // .openapi(routes.remove, handlers.remove);

export default router;
