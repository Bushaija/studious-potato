import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { IdParamsSchema } from "stoker/openapi/schemas";
import { 
  selectEventSchema, 
  insertEventSchema, 
  patchEventSchema 
} from "./events.types";
import { notFoundSchema } from "@/api/lib/constants";

const tags = ["events"];

export const list = createRoute({
  path: "/events",
  method: "get",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectEventSchema),
      "The list of events"
    ),
  },
});

export const getOne = createRoute({
  path: "/events/{id}",
  method: "get",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectEventSchema,
      "The event"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Event not found"
    ),
  },
});

export const create = createRoute({
  path: "/events",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(
      insertEventSchema,
      "The event to create"
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectEventSchema,
      "The created event"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      notFoundSchema,
      "Invalid event data"
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      notFoundSchema,
      "Event with this code or note number already exists"
    ),
  },
});

export const update = createRoute({
  path: "/events/{id}",
  method: "put",
  tags,
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(
      insertEventSchema,
      "The event updates"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectEventSchema,
      "The updated event"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Event not found"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      notFoundSchema,
      "Invalid event data"
    ),
  },
});

export const patch = createRoute({
  path: "/events/{id}",
  method: "patch",
  tags,
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(
      patchEventSchema,
      "The event partial updates"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectEventSchema,
      "The updated event"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Event not found"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      notFoundSchema,
      "Invalid event data"
    ),
  },
});

export const remove = createRoute({
  path: "/events/{id}",
  method: "delete",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Event deleted successfully",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Event not found"
    ),
  },
});

export type ListRoute = typeof list;
export type GetOneRoute = typeof getOne;
export type CreateRoute = typeof create;
export type UpdateRoute = typeof update;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;