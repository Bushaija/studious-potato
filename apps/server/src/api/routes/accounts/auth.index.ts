import { createRouter } from "@/api/lib/create-app"
import * as handlers from "./auth.handlers"
import * as routes from "./auth.routes"
import * as setupHandlers from "./setup-account.handlers"
import * as setupRoutes from "./setup-account.routes"

const router = createRouter()
  .openapi(routes.banUser, handlers.banUser)
  .openapi(routes.unbanUser, handlers.unbanUser)
  .openapi(routes.getAccessibleFacilities, handlers.getAccessibleFacilities)
  .openapi(setupRoutes.verifySetupToken, setupHandlers.verifySetupToken)
  .openapi(setupRoutes.setupAccountPassword, setupHandlers.setupAccountPassword)

export default router;