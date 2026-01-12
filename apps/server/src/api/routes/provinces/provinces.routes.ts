import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema, IdParamsSchema } from "stoker/openapi/schemas";

// import { insertProvinceSchema, patchProvinceSchema, selectProvinceSchema } from "@/db/schema";
import { selectProvinceSchema } from "./provinces.types";
import { notFoundSchema } from "@/api/lib/constants";

const tags = ["provinces"];

export const list = createRoute({
    path: "/provinces",
    method: "get",
    tags,
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(selectProvinceSchema),
            "The list of provinces"
        )
    }
});

// export const create = createRoute({
//     path: "/provinces",
//     method: "post",
//     tags,
//     request: {
//         body: jsonContentRequired(insertProvinceSchema, "The province to create"),
//     },
//     responses: {
//         [HttpStatusCodes.CREATED]: jsonContent(
//             selectProvinceSchema,
//             "The created province"
//         ),
//         [HttpStatusCodes.BAD_REQUEST]: jsonContent(
//             z.object({
//                 error: z.string(),
//                 message: z.string(),
//             }),
//             "Invalid province data"
//         ),
//     }
// });

export const getOne = createRoute({
    path: "/provinces/{id}",
    method: "get",
    tags,
    request: {
        params: IdParamsSchema,
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            selectProvinceSchema,
            "The province"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
            notFoundSchema,
            "Province not found"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(IdParamsSchema),
            "Invalid province ID"
        ),
    }
});

// export const update = createRoute({
//     path: "/provinces/{id}",
//     method: "patch",
//     tags,
//     request: {
//         params: IdParamsSchema,
//         body: jsonContentRequired(patchProvinceSchema, "The province data to update"),
//     },
//     responses: {
//         [HttpStatusCodes.OK]: jsonContent(
//             selectProvinceSchema,
//             "The updated province"
//         ),
//         [HttpStatusCodes.NOT_FOUND]: jsonContent(
//             notFoundSchema,
//             "Province not found"
//         ),
//         [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
//             createErrorSchema(IdParamsSchema)
//             .or(createErrorSchema(IdParamsSchema)),
//             "Invalid province ID"
//         ),
//     }
// });

// export const remove = createRoute({
//     path: "/provinces/{id}",
//     method: "delete",
//     tags,
//     request: {
//         params: IdParamsSchema,
//     },
//     responses: {
//         [HttpStatusCodes.NO_CONTENT]: {
//             description: "The province was deleted",
//         },
//         [HttpStatusCodes.NOT_FOUND]: jsonContent(
//             notFoundSchema,
//             "Province not found"
//         ),
//         [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
//           createErrorSchema(IdParamsSchema),
//           "Invalid id error",
//         ),
//     }
// });

export type ListRoute = typeof list;
export type GetOneRoute = typeof getOne;
// export type CreateRoute = typeof create;
// export type UpdateRoute = typeof update;
// export type RemoveRoute = typeof remove;