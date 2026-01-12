import { z } from "@hono/zod-openapi";

export const insertEventSchema = z.object({
  noteNumber: z.number().int(),
  code: z.string().max(50),
  description: z.string(),
  statementCodes: z.array(z.string()),
  eventType: z.enum(['REVENUE', 'EXPENSE', 'ASSET', 'LIABILITY', 'EQUITY']),
  isCurrent: z.boolean().default(true),
  displayOrder: z.number().int(),
});

export const selectEventSchema = z.object({
  id: z.number().int(),
  noteNumber: z.number().int(),
  code: z.string(),
  description: z.string(),
  statementCodes: z.array(z.string()),
  eventType: z.enum(['REVENUE', 'EXPENSE', 'ASSET', 'LIABILITY', 'EQUITY']),
  isCurrent: z.boolean(),
  displayOrder: z.number().int(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const patchEventSchema = insertEventSchema.partial();
