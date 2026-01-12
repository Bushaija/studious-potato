// import { createRouter } from "@/api/lib/create-app"
// import * as handlers from "./admin.handlers"
// import * as routes from "./admin.routes"

// const router = createRouter()
//   // User management routes
//   .openapi(routes.createUserAccount, handlers.createUserAccount)
//   .openapi(routes.getUsers, handlers.getUsers)
//   .openapi(routes.getUser, handlers.getUser)
//   .openapi(routes.updateUser, handlers.updateUser)
//   .openapi(routes.toggleUserStatus, handlers.toggleUserStatus)
//   .openapi(routes.resetUserPassword, handlers.resetUserPassword)
// //   .openapi(routes.deleteUser, handlers.deleteUser)
//   .openapi(routes.getUserActivityLogs, handlers.getUserActivityLogs)
//   .openapi(routes.bulkUserOperations, handlers.bulkUserOperations)
  
//   // System statistics
//   .openapi(routes.getSystemStats, handlers.getSystemStats)

// export default router

import { createRouter } from "@/api/lib/create-app"
import * as handlers from "./admin.handlers"
import * as routes from "./admin.routes"

const router = createRouter()
  // User management routes
  .openapi(routes.createUserAccount, handlers.createUserAccount)
  .openapi(routes.getUsers, handlers.getUsers)
  .openapi(routes.getUser, handlers.getUser)
  .openapi(routes.updateUser, handlers.updateUser)
  .openapi(routes.toggleUserStatus, handlers.toggleUserStatus)
  .openapi(routes.resetUserPassword, handlers.resetUserPassword)
  .openapi(routes.deleteUser, handlers.deleteUser) // Now enabled with better-auth integration
  .openapi(routes.getUserActivityLogs, handlers.getUserActivityLogs)
  .openapi(routes.bulkUserOperations, handlers.bulkUserOperations)
  
  // System statistics
  .openapi(routes.getSystemStats, handlers.getSystemStats)

export default router