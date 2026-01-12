import { createRouter } from "@/api/lib/create-app";

import * as handlers from "./documents.handlers";
import * as routes from "./documents.routes";

const router = createRouter()
  .openapi(routes.upload, handlers.upload)
  .openapi(routes.list, handlers.list)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.verify, handlers.verify)
  .openapi(routes.unverify, handlers.unverify)
  .openapi(routes.softDelete, handlers.softDelete)
  .openapi(routes.restore, handlers.restore)
  .openapi(routes.download, handlers.download)
  .openapi(routes.getByExecutionEntry, handlers.getByExecutionEntry);

export default router;
