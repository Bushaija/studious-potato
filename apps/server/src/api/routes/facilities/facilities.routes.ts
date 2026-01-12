import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { IdParamsSchema } from "stoker/openapi/schemas";
import { selectFacilitySchema } from "./facilities.types";
import { badRequestSchema, notFoundSchema } from "@/api/lib/constants";
import { z } from "@hono/zod-openapi";

const tags = ["facilities"];

export const FacilityByDistrictSchema = selectFacilitySchema.pick({
    id: true,
    name: true,
    facilityType: true,
});

export const getByDistrict = createRoute({
    path: "/facilities/by-district",
    method: "get",
    tags,
    request: {
        query: z.object({
            districtId: z.coerce.number().int().positive("District ID must be a positive integer"),
        }),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(FacilityByDistrictSchema),
            "A list of facilities in the district"
        ),
        [HttpStatusCodes.BAD_REQUEST]: jsonContent(
            badRequestSchema,
            "Invalid district ID"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Facilities not found"
        ),
    },
});

export const getByName = createRoute({
    path: "/facilities/by-name",
    method: "get",
    tags,
    request: {
        query: z.object({
            facilityName: z.string().min(1, "Facility name is required"),
        }),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.object({
                facilityId: z.coerce.number(),
                facilityName: z.string(),
            }),
            "The facility"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Facility not found"
        ),
        [HttpStatusCodes.BAD_REQUEST]: jsonContent(
            badRequestSchema,
            "Invalid facility data"
        ),
    },
});

export const list = createRoute({
    path: "/facilities",
    method: "get",
    tags,
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(selectFacilitySchema),
            "The list of facilities"
        )
    }
});

export const getOne = createRoute({
    path: "/facilities/{id}",
    method: "get",
    tags,
    request: {
        params: IdParamsSchema,
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectFacilitySchema,
            "The facility"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Facility not found"
        ),
    }
});

export const getPlanned = createRoute({
    path: "/facilities/planned",
    method: "get",
    tags,
    request: {
        query: z.object({
            program: z.enum(["Malaria", "HIV", "TB"]),
            facilityType: z.enum(["hospital", "health_center"]),
            facilityId: z.coerce.number().int().positive("Facility ID must be a positive integer"),
            reportingPeriodId: z.coerce.number().int().positive("Reporting Period ID must be a positive integer").optional(),
        }),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.object({
                program: z.string(),
                facilityType: z.string(),
                facilityId: z.number().int(),
                reportingPeriodId: z.number().int(),
                availableFacilities: z.array(z.object({
                    id: z.number().int(),
                    name: z.string(),
                })),
                count: z.number().int(),
            }),
            "List of available facilities for planning based on program, facility type, hospital facility, and reporting period"
        ),
        [HttpStatusCodes.BAD_REQUEST]: jsonContent(
            badRequestSchema,
            "Invalid query parameters or TB program requires hospital facility type"
        ),
    }
});

export const getExecution = createRoute({
    path: "/facilities/execution",
    method: "get",
    tags,
    request: {
        query: z.object({
            program: z.enum(["Malaria", "HIV", "TB"]),
            facilityType: z.enum(["hospital", "health_center"]),
            facilityId: z.coerce.number().int().positive("Facility ID must be a positive integer"),
            reportingPeriodId: z.coerce.number().int().positive("Reporting Period ID must be a positive integer").optional(),
            quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]).optional(),
        }),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.union([
                // Single quarter mode response
                z.object({
                    program: z.string(),
                    facilityType: z.string(),
                    facilityId: z.number().int(),
                    reportingPeriodId: z.number().int(),
                    quarter: z.string(),
                    currentQuarter: z.string(),
                    availableFacilities: z.array(z.object({
                        id: z.number().int(),
                        name: z.string(),
                    })),
                    count: z.number().int(),
                }),
                // Quarter discovery mode response
                z.object({
                    program: z.string(),
                    facilityType: z.string(),
                    facilityId: z.number().int(),
                    reportingPeriodId: z.number().int(),
                    currentQuarter: z.string(),
                    availableFacilities: z.array(z.object({
                        id: z.number().int(),
                        name: z.string(),
                        availableQuarters: z.array(z.string()),
                    })),
                    count: z.number().int(),
                })
            ]),
            "List of facilities available for execution within the specified reporting period. When quarter is specified, returns facilities for that quarter. When quarter is omitted, returns facilities with their available quarters for execution."
        ),
        [HttpStatusCodes.BAD_REQUEST]: jsonContent(
            badRequestSchema,
            "Invalid query parameters, TB program requires hospital facility type, or invalid reporting period"
        ),
    }
});

export const getAll = createRoute({
    path: "/facilities/all",
    method: "get",
    tags,
    summary: "Get all facilities with district information",
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(
                z.object({
                    id: z.number().int(),
                    name: z.string(),
                    facilityType: z.enum(["hospital", "health_center"]),
                    districtId: z.number().int(),
                    districtName: z.string(),
                })
            ),
            "List of all facilities with district names"
        ),
    }
});

export const getAccessible = createRoute({
    path: "/facilities/accessible",
    method: "get",
    tags,
    summary: "Get user's accessible facilities based on role and hierarchy",
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(
                z.object({
                    id: z.number().int(),
                    name: z.string(),
                    facilityType: z.enum(["hospital", "health_center"]),
                    districtId: z.number().int(),
                    districtName: z.string(),
                    parentFacilityId: z.number().int().nullable(),
                })
            ),
            "List of facilities accessible to the current user"
        ),
        [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
            z.object({ message: z.string() }),
            "User not authenticated"
        ),
    }
});

export const getHierarchy = createRoute({
    path: "/facilities/{id}/hierarchy",
    method: "get",
    tags,
    summary: "Get facility hierarchy showing parent and child facilities",
    request: {
        params: IdParamsSchema,
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.object({
                facility: z.object({
                    id: z.number().int(),
                    name: z.string(),
                    facilityType: z.enum(["hospital", "health_center"]),
                    districtId: z.number().int(),
                    districtName: z.string(),
                    parentFacilityId: z.number().int().nullable(),
                }),
                parentFacility: z.object({
                    id: z.number().int(),
                    name: z.string(),
                    facilityType: z.enum(["hospital", "health_center"]),
                    districtId: z.number().int(),
                }).nullable(),
                childFacilities: z.array(
                    z.object({
                        id: z.number().int(),
                        name: z.string(),
                        facilityType: z.enum(["hospital", "health_center"]),
                        districtId: z.number().int(),
                    })
                ),
            }),
            "Facility hierarchy information"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Facility not found"
        ),
        [HttpStatusCodes.FORBIDDEN]: jsonContent(
            z.object({ message: z.string() }),
            "User does not have access to this facility"
        ),
        [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
            z.object({ message: z.string() }),
            "User not authenticated"
        ),
    }
});

export type GetByDistrictRoute = typeof getByDistrict;
export type GetByNameRoute = typeof getByName;
export type ListRoute = typeof list;
export type GetOneRoute = typeof getOne;
export type GetPlannedRoute = typeof getPlanned;
export type GetExecutionRoute = typeof getExecution;
export type GetAllRoute = typeof getAll;
export type GetAccessibleRoute = typeof getAccessible;
export type GetHierarchyRoute = typeof getHierarchy;