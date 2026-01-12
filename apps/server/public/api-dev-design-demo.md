// districts.types.ts

import { z } from "@hono/zod-openapi";

// Districts
export const insertDistrictSchema = z.object({
	name: z.string(),
	provinceId: z.number().int(),
});
export const selectDistrictSchema = z.object({
	id: z.number().int(),
	name: z.string(),
	provinceId: z.number().int(),
});
export const patchDistrictSchema = insertDistrictSchema.partial();

// districts.routes.ts

import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { IdParamsSchema } from "stoker/openapi/schemas";
import { selectDistrictSchema } from "./districts.types";
import { notFoundSchema } from "@/api/lib/constants";

const tags = ["districts"];

export const list = createRoute({
    path: "/districts",
    method: "get",
    tags,
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




//districts.handlers.ts

import { eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { db } from "@/db";
import { districts } from "@/db/schema";
import type { AppRouteHandler } from "@/lib/types";
import type { ListRoute, GetOneRoute } from "./districts.routes";

export const list: AppRouteHandler<ListRoute> = async (c) => {
    const data = await db.query.districts.findMany();
    return c.json(data);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
    const { id } = c.req.param()
    const districtId = parseInt(id)
    const data = await db.query.districts.findFirst({
        where: eq(districts.id, districtId),
    });

    if (!data) {
        return c.json(
            {
                message: "District not found",
            },
            HttpStatusCodes.NOT_FOUND
        );
    }
    return c.json(data, HttpStatusCodes.OK);
};



// districts.index.ts

import { createRouter } from "@/api/lib/create-app";

import * as handlers from "./districts.handlers";
import * as routes from "./districts.routes";

const router = createRouter()
    .openapi(routes.list, handlers.list)
    .openapi(routes.getOne, handlers.getOne);

export default router;
