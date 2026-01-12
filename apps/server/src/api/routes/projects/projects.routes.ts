import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { IdParamsSchema } from "stoker/openapi/schemas";
import { 
  selectProjectSchema, 
  insertProjectSchema, 
  patchProjectSchema,
  projectQuerySchema 
} from "./projects.types";
import { notFoundSchema } from "@/api/lib/constants";


const tags = ["projects"];

export const list = createRoute({
  path: "/projects",
  method: "get",
  tags,
  request: {
    query: projectQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectProjectSchema),
      "The list of projects"
    ),
  },
});

export const getOne = createRoute({
  path: "/projects/{id}",
  method: "get",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectProjectSchema,
      "The project"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Project not found"
    ),
  },
});

export const create = createRoute({
  path: "/projects",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(
      insertProjectSchema,
      "The project to create"
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectProjectSchema,
      "The created project"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      notFoundSchema,
      "Invalid project data"
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      notFoundSchema,
      "Project with this name or code already exists"
    ),
  },
});

export const update = createRoute({
  path: "/projects/{id}",
  method: "put",
  tags,
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(
      insertProjectSchema,
      "The project updates"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectProjectSchema,
      "The updated project"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Project not found"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      notFoundSchema,
      "Invalid project data"
    ),
  },
});

export const patch = createRoute({
  path: "/projects/{id}",
  method: "patch",
  tags,
  request: {
    params: IdParamsSchema,
    body: jsonContent(
      patchProjectSchema,
      "The project partial updates"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectProjectSchema,
      "The updated project"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Project not found"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      notFoundSchema,
      "Invalid project data"
    ),
  },
});

export const remove = createRoute({
  path: "/projects/{id}",
  method: "delete",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Project deleted successfully",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Project not found"
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      notFoundSchema,
      "Cannot delete project with existing data"
    ),
  },
});

export type ListRoute = typeof list;
export type GetOneRoute = typeof getOne;
export type CreateRoute = typeof create;
export type UpdateRoute = typeof update;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;