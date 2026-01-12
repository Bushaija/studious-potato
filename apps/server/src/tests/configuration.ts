// API Endpoint: /api/planning/configuration
import { Request, Response } from 'express';
import { db } from '@/lib/db'; // Your database connection
import { 
  facilities, 
  districts, 
  provinces,
  formSchemas,
  schemaActivityCategories,
  dynamicActivities,
  enhancedProjects
} from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

interface PlanningConfigurationRequest {
  program: 'HIV' | 'Malaria' | 'TB';
  facilityType: 'hospital' | 'health_center';
  facilityId?: number;
  districtId?: number;
  provinceId?: number;
}

interface PlanningConfigurationResponse {
  success: boolean;
  data: {
    facilities: Array<{
      id: number;
      name: string;
      facilityType: string;
      district: {
        id: number;
        name: string;
        province: {
          id: number;
          name: string;
        };
      };
    }>;
    formSchema: {
      id: number;
      name: string;
      version: string;
      schema: any;
      fields: Array<{
        id: number;
        fieldKey: string;
        label: string;
        fieldType: string;
        isRequired: boolean;
        displayOrder: number;
        fieldConfig: any;
        validationRules: any;
      }>;
    } | null;
    activityCategories: Array<{
      id: number;
      code: string;
      name: string;
      description: string;
      displayOrder: number;
      activities: Array<{
        id: number;
        code: string;
        name: string;
        activityType: string;
        displayOrder: number;
        isTotalRow: boolean;
        isAnnualOnly: boolean;
      }>;
    }>;
    metadata: {
      totalFacilities: number;
      hasActiveSchema: boolean;
      supportedModules: string[];
    };
  };
  error?: string;
}

export async function getPlanningConfiguration(
  req: Request<{}, {}, {}, PlanningConfigurationRequest>,
  res: Response<PlanningConfigurationResponse>
) {
  try {
    const { program, facilityType, facilityId, districtId, provinceId } = req.query;

    // Validate required parameters
    if (!program || !facilityType) {
      return res.status(400).json({
        success: false,
        data: {
          facilities: [],
          formSchema: null,
          activityCategories: [],
          metadata: {
            totalFacilities: 0,
            hasActiveSchema: false,
            supportedModules: []
          }
        },
        error: 'Program and facility type are required'
      });
    }

    // Build facility query conditions
    let facilityConditions = [eq(facilities.facilityType, facilityType)];
    
    if (facilityId) {
      facilityConditions.push(eq(facilities.id, facilityId));
    }
    if (districtId) {
      facilityConditions.push(eq(facilities.districtId, districtId));
    }

    // 1. Get facilities with location data
    const facilitiesQuery = db
      .select({
        id: facilities.id,
        name: facilities.name,
        facilityType: facilities.facilityType,
        districtId: facilities.districtId,
        districtName: districts.name,
        provinceId: provinces.id,
        provinceName: provinces.name,
      })
      .from(facilities)
      .leftJoin(districts, eq(facilities.districtId, districts.id))
      .leftJoin(provinces, eq(districts.provinceId, provinces.id))
      .where(and(...facilityConditions));

    if (provinceId) {
      facilitiesQuery.where(eq(provinces.id, provinceId));
    }

    const facilitiesResult = await facilitiesQuery;

    // 2. Get active form schema for this program/facility type combination
    const activeFormSchema = await db
      .select()
      .from(formSchemas)
      .where(
        and(
          eq(formSchemas.projectType, program.toUpperCase() as any),
          eq(formSchemas.facilityType, facilityType),
          eq(formSchemas.moduleType, 'planning'),
          eq(formSchemas.isActive, true)
        )
      )
      .orderBy(formSchemas.version)
      .limit(1);

    let formSchemaData = null;
    if (activeFormSchema.length > 0) {
      const schema = activeFormSchema[0];
      
      // Get form fields for this schema
      const formFields = await db
        .select()
        .from(formFields)
        .where(eq(formFields.schemaId, schema.id))
        .orderBy(formFields.displayOrder);

      formSchemaData = {
        id: schema.id,
        name: schema.name,
        version: schema.version,
        schema: schema.schema,
        fields: formFields.map(field => ({
          id: field.id,
          fieldKey: field.fieldKey,
          label: field.label,
          fieldType: field.fieldType,
          isRequired: field.isRequired,
          displayOrder: field.displayOrder,
          fieldConfig: field.fieldConfig,
          validationRules: field.validationRules
        }))
      };
    }

    // 3. Get activity categories and their activities
    const activityCategoriesResult = await db
      .select()
      .from(schemaActivityCategories)
      .where(
        and(
          eq(schemaActivityCategories.projectType, program.toUpperCase() as any),
          eq(schemaActivityCategories.facilityType, facilityType),
          eq(schemaActivityCategories.isActive, true)
        )
      )
      .orderBy(schemaActivityCategories.displayOrder);

    const categoriesWithActivities = await Promise.all(
      activityCategoriesResult.map(async (category) => {
        const activities = await db
          .select()
          .from(dynamicActivities)
          .where(
            and(
              eq(dynamicActivities.categoryId, category.id),
              eq(dynamicActivities.isActive, true)
            )
          )
          .orderBy(dynamicActivities.displayOrder);

        return {
          id: category.id,
          code: category.code,
          name: category.name,
          description: category.description,
          displayOrder: category.displayOrder,
          activities: activities.map(activity => ({
            id: activity.id,
            code: activity.code,
            name: activity.name,
            activityType: activity.activityType,
            displayOrder: activity.displayOrder,
            isTotalRow: activity.isTotalRow,
            isAnnualOnly: activity.isAnnualOnly
          }))
        };
      })
    );

    // 4. Format response
    const response: PlanningConfigurationResponse = {
      success: true,
      data: {
        facilities: facilitiesResult.map(facility => ({
          id: facility.id,
          name: facility.name,
          facilityType: facility.facilityType,
          district: {
            id: facility.districtId,
            name: facility.districtName,
            province: {
              id: facility.provinceId,
              name: facility.provinceName
            }
          }
        })),
        formSchema: formSchemaData,
        activityCategories: categoriesWithActivities,
        metadata: {
          totalFacilities: facilitiesResult.length,
          hasActiveSchema: formSchemaData !== null,
          supportedModules: formSchemaData ? ['planning'] : []
        }
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error fetching planning configuration:', error);
    return res.status(500).json({
      success: false,
      data: {
        facilities: [],
        formSchema: null,
        activityCategories: [],
        metadata: {
          totalFacilities: 0,
          hasActiveSchema: false,
          supportedModules: []
        }
      },
      error: 'Internal server error'
    });
  }
}

// Additional endpoint for creating a new plan with the configuration
export async function createPlanWithConfiguration(
  req: Request,
  res: Response
) {
  try {
    const { 
      program, 
      facilityId, 
      reportingPeriodId, 
      userId,
      formData 
    } = req.body;

    // Validate required fields
    if (!program || !facilityId || !reportingPeriodId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Get facility details
    const facility = await db
      .select()
      .from(facilities)
      .where(eq(facilities.id, facilityId))
      .limit(1);

    if (facility.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Facility not found'
      });
    }

    // Create new project/plan
    const newProject = await db
      .insert(enhancedProjects)
      .values({
        name: `${program} Plan - ${facility[0].name}`,
        code: `${program.toUpperCase()}-${facility[0].name.replace(/\s+/g, '-').toUpperCase()}`,
        projectType: program.toUpperCase() as any,
        facilityId,
        reportingPeriodId,
        userId,
        metadata: {
          facilityType: facility[0].facilityType,
          createdVia: 'api',
          configurationSnapshot: formData
        }
      })
      .returning();

    // If form data provided, create initial form data entry
    if (formData && newProject.length > 0) {
      const activeSchema = await db
        .select()
        .from(formSchemas)
        .where(
          and(
            eq(formSchemas.projectType, program.toUpperCase() as any),
            eq(formSchemas.facilityType, facility[0].facilityType),
            eq(formSchemas.moduleType, 'planning'),
            eq(formSchemas.isActive, true)
          )
        )
        .limit(1);

      if (activeSchema.length > 0) {
        await db
          .insert(schemaFormDataEntries)
          .values({
            schemaId: activeSchema[0].id,
            entityId: newProject[0].id,
            entityType: 'planning',
            projectId: newProject[0].id,
            facilityId,
            reportingPeriodId,
            formData,
            createdBy: userId
          });
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        project: newProject[0],
        message: 'Plan created successfully'
      }
    });

  } catch (error) {
    console.error('Error creating plan:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create plan'
    });
  }
}

// Utility function to migrate existing JSON data to database
export async function migrateHardcodedData(hardcodedData: any[]) {
  try {
    for (const programData of hardcodedData) {
      const { program, "facility-type": facilityType, hospitals, "health-centers": healthCenters } = programData;
      
      // Create or update activity categories and activities based on the structure
      const allFacilities = [...hospitals, ...healthCenters];
      
      for (const facilityName of allFacilities) {
        // Find facility in database
        const facility = await db
          .select()
          .from(facilities)
          .where(eq(facilities.name, facilityName.trim()))
          .limit(1);

        if (facility.length === 0) {
          console.warn(`Facility not found: ${facilityName}`);
          continue;
        }

        // Create default categories and activities if they don't exist
        // This would be customized based on your specific business logic
      }
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}
