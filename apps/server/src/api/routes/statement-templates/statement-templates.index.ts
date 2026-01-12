import { createRouter } from "@/api/lib/create-app";

import * as handlers from "./statement-templates.handlers";
import * as routes from "./statement-templates.routes";

const router = createRouter()
.openapi(routes.getStatementCodes, handlers.getStatementCodes)
  .openapi(routes.getByStatementCode, handlers.getByStatementCode)
  .openapi(routes.validateTemplate, handlers.validateTemplate)
  .openapi(routes.bulkCreate, handlers.bulkCreate)
  .openapi(routes.bulkUpdate, handlers.bulkUpdate)
  .openapi(routes.reorder, handlers.reorder)
  .openapi(routes.duplicateTemplate, handlers.duplicateTemplate)
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.update, handlers.update)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove)

export default router;