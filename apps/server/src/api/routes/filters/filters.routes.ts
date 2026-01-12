import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";

import { notFoundSchema } from "@/api/lib/constants";
import {
  planningConfigurationQuerySchema,
  planningConfigurationResponseSchema,
  createPlanWithConfigurationBodySchema,
  createPlanWithConfigurationResponseSchema,
} from "./filters.types";

const tags = ["filters"];

export const getFacilities = createRoute({
  path: "/filters/facilities",
  method: "get",
  tags,
  request: {
    query: planningConfigurationQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      planningConfigurationResponseSchema,
      "Planning configuration payload"
    ),
  },
});

export const createFacilitiesPlanning = createRoute({
  path: "/filters/facilities/planning",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(
      createPlanWithConfigurationBodySchema,
      "Create plan request"
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      createPlanWithConfigurationResponseSchema,
      "Plan created"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      notFoundSchema,
      "Invalid request"
    ),
  },
});

export type GetFacilitiesRoute = typeof getFacilities;
export type CreateFacilitiesPlanningRoute = typeof createFacilitiesPlanning;


