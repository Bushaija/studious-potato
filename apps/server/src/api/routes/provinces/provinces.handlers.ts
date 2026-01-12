import { eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { db } from "@/api/db";
import { provinces } from "@/api/db/schema";
import type { AppRouteHandler } from "@/api/lib/types";
import type { ListRoute, GetOneRoute } from "./provinces.routes";


export const list: AppRouteHandler<ListRoute> = async (c) => {
    const data = await db.query.provinces.findMany();
    return c.json(data);
};


export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
    const { id } = c.req.param();
    const data = await db.query.provinces.findFirst({
        where: eq(provinces.id, parseInt(id)),
    });

    if (!data) {
        return c.json(
            {
                message: "Province not found",
            },
            HttpStatusCodes.NOT_FOUND
        );
    }
    return c.json(data, HttpStatusCodes.OK);
};

