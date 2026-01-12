import { z } from "@hono/zod-openapi";

export const insertFacilitySchema = z.object({
	name: z.string(),
	facilityType: z.enum(['hospital', 'health_center']),
	districtId: z.number().int(),
});
export const selectFacilitySchema = z.object({
	id: z.number().int(),
	name: z.string(),
	facilityType: z.enum(['hospital', 'health_center']),
	districtId: z.number().int(),
});
export const patchFacilitySchema = insertFacilitySchema.partial();
