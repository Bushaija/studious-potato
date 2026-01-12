import { z } from 'zod';

export const ActivityFormDataSchema = z.record(
    z.string(),
    z.object({
        frequency: z.number().min(1).max(365).default(1),
        unitCost: z.number().min(0).default(0),
        q1Count: z.number().min(0).default(0),
        q2Count: z.number().min(0).default(0),
        q3Count: z.number().min(0).default(0),
        q4Count: z.number().min(0).default(0),
        coments: z.string().optional().default('')
    }).partial()
);

export const CreatePlanningRequestSchema = z.object({
    schemaId: z.number().positive(),
    activityId: z.number().positive().optional(),
    projectId: z.number().positive(),
    facilityId: z.number().positive(),
    reportingPeriodId: z.number().positive().optional(),
    formatData: z.record(z.string(), z.any()),
    metadata: z.record(z.string(), z.any().optional()),
});

export const UpdatePlanningRequestSchema = z.object({
    formData: z.record(z.string(), z.any()).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    reportingPeriodId: z.number().positive().optional(),
  });
  
export function validateFormData(data: unknown): { success: boolean; data?: any; errors?: string[] } {
    try {
      const result = ActivityFormDataSchema.parse(data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { success: false, errors };
      }
      return { success: false, errors: ['Invalid form data structure'] };
    }
  };