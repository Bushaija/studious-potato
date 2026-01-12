import { honoClient as client } from "@/api-client/index";
import { baseFetch } from "@/types/api";
import type { InferRequestType, InferResponseType } from "hono/client";

// Types for schema operations
export type GetSchemasParams = InferRequestType<
  (typeof client)["schemas"]["$get"]
>["query"];

export type GetSchemasResponse = InferResponseType<
  (typeof client)["schemas"]["$get"]
>;

export type GetSchemaParams = InferRequestType<
  (typeof client)["schemas"][":id"]["$get"]
>["param"];

export type GetSchemaResponse = InferResponseType<
  (typeof client)["schemas"][":id"]["$get"]
>;

// Schema listing with filters
export async function getSchemas(params: GetSchemasParams = {}) {
  return baseFetch<GetSchemasResponse>(() =>
    client.schemas.$get({ query: params })
  );
}

// Single schema by ID
export async function getSchema(params: GetSchemaParams) {
  return baseFetch<GetSchemaResponse>(() =>
    client.schemas[":id"].$get({
      param: { id: params.id.toString() }
    })
  );
}

// Specialized fetchers for common use cases
export async function getSchemasByModule(
    moduleType: 'planning' | 'execution' | 'reporting',
    additionalFilters: Omit<GetSchemasParams, 'moduleType'> = {}
  ) {
    return getSchemas({
      ...additionalFilters,
      moduleType,
      isActive: true // Default to active schemas
    });
  }
  

export async function getActiveSchemas(filters: GetSchemasParams = {}) {
  return getSchemas({
    ...filters,
    isActive: true
  });
}

export async function getSchemasByFacilityAndProject(
  facilityType: 'hospital' | 'health_center',
  projectType: 'HIV' | 'Malaria' | 'TB',
  moduleType?: 'planning' | 'execution' | 'reporting'
) {
  return getSchemas({
    facilityType,
    projectType,
    moduleType,
    isActive: true
  });
}