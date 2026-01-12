import { z } from "@hono/zod-openapi";

// Provinces
export const insertProvinceSchema = z.object({
	name: z.string(),
});
export const selectProvinceSchema = z.object({
	id: z.number().int(),
	name: z.string(),
});
export const patchProvinceSchema = insertProvinceSchema.partial();