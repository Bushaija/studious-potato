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