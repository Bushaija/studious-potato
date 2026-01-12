import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { IdParamsSchema } from "stoker/openapi/schemas";
import { selectDistrictSchema } from "./districts.types";
import { notFoundSchema } from "@/api/lib/constants";

const tags = ["districts"];

export const list = createRoute({
    path: "/districts",
    method: "get",
    tags,
    request: {
        query: z.object({
            provinceId: z.string().optional().openapi({
                param: {
                    name: "provinceId",
                    in: "query",
                },
                description: "Filter districts by province ID",
                example: "1"
            })
        })
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(selectDistrictSchema),
            "The list of districts"
        )
    }
});

export const getOne = createRoute({
    path: "/districts/{id}",
    method: "get",
    tags,
    request: {
        params: IdParamsSchema,
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectDistrictSchema,
            "The district"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "District not found"
        ),
    }
});


export type ListRoute = typeof list;
export type GetOneRoute = typeof getOne;
