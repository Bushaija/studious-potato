import { createRouter } from "@/api/lib/create-app";

import * as handlers from "./validations.handlers";
import * as routes from "./validations.routes";

const router = createRouter()
  .openapi(routes.validateField, handlers.validateField)
  .openapi(routes.validateForm, handlers.validateForm)
  .openapi(routes.validateSchema, handlers.validateSchema)
  .openapi(routes.bulkValidate, handlers.bulkValidate)
  .openapi(routes.getValidationRules, handlers.getValidationRules)
  .openapi(routes.validateComputation, handlers.validateComputation);

export default router;