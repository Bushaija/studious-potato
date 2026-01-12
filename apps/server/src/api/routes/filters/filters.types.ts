import { z } from "@hono/zod-openapi";

export const programEnum = z.enum(["HIV", "Malaria", "TB"]);
export const projectTypeEnum = z.enum(["HIV", "Malaria", "TB"]);

export const planningConfigurationQuerySchema = z.object({
  projectType: projectTypeEnum,
  districtId: z.string().optional(),
});
const locationSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const planningConfigurationResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    facilities: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        facilityType: z.string(),
        district: z.object({
          id: z.number(),
          name: z.string(),
          province: locationSchema,
        }),
      })
    ),
    // formSchema: z
    //   .object({
    //     id: z.number(),
    //     name: z.string(),
    //     version: z.string(),
    //     schema: z.any(),
    //     fields: z.array(
    //       z.object({
    //         id: z.number(),
    //         fieldKey: z.string(),
    //         label: z.string(),
    //         fieldType: z.string(),
    //         isRequired: z.boolean(),
    //         displayOrder: z.number(),
    //         fieldConfig: z.any().nullable().optional(),
    //         validationRules: z.any().nullable().optional(),
    //       })
    //     ),
    //   })
    //   .nullable(),
    // activityCategories: z.array(
    //   z.object({
    //     id: z.number(),
    //     code: z.string(),
    //     name: z.string(),
    //     description: z.string().nullable().optional(),
    //     displayOrder: z.number(),
    //     activities: z.array(
    //       z.object({
    //         id: z.number(),
    //         code: z.string().nullable().optional(),
    //         name: z.string(),
    //         activityType: z.string().nullable().optional(),
    //         displayOrder: z.number(),
    //         isTotalRow: z.boolean(),
    //         isAnnualOnly: z.boolean(),
    //       })
    //     ),
    //   })
    // ),
    // metadata: z.object({
    //   totalFacilities: z.number(),
    //   hasActiveSchema: z.boolean(),
    //   supportedModules: z.array(z.string()),
    // }),
  }),
  error: z.string().optional(),
});

export const createPlanWithConfigurationBodySchema = z.object({
  program: programEnum,
  facilityId: z.number(),
  reportingPeriodId: z.number(),
  userId: z.number(),
  formData: z.any().optional(),
});

export const createPlanWithConfigurationResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      project: z.any(),
      message: z.string(),
    })
    .optional(),
  error: z.string().optional(),
});

export type PlanningConfigurationQuery = z.infer<typeof planningConfigurationQuerySchema>;

