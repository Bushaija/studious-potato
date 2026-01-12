import { and, eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { db } from "@/db";
import {
  facilities,
  districts,
  provinces,
  formSchemas,
  projects,
  schemaFormDataEntries,
} from "@/db/schema";
import type { AppRouteHandler } from "@/api/lib/types";

import type {
  GetFacilitiesRoute,
  CreateFacilitiesPlanningRoute,
} from "./filters.routes";

export const getFacilities: AppRouteHandler<GetFacilitiesRoute> = async (c) => {
  try {
    const query = c.req.query();
    const projectType = query.projectType;
    const districtId = query.districtId ? parseInt(query.districtId) : undefined;

    console.log('🔍 [getFacilities] Server received query:', {
      projectType,
      districtId
    });

    if (!projectType) {
      return c.json(
        {
          success: false,
          data: {
            facilities: [],
          },
          error: "ProjectType is required",
        },
        HttpStatusCodes.BAD_REQUEST,
      );
    }

    // Get facilities that have active schemas for the specified projectType
    const facilitiesWithActiveSchemas = await db
      .select({
        facilityId: formSchemas.facilityType,
      })
      .from(formSchemas)
      .where(
        and(
          eq(formSchemas.projectType, projectType as any),
          eq(formSchemas.isActive, true),
        ),
      );

    // Get all facilities with their district and province info
    const facilitiesResult = districtId 
      ? await db
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
          .where(eq(facilities.districtId, districtId))
      : await db
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
          .leftJoin(provinces, eq(districts.provinceId, provinces.id));

    // Filter facilities to only include those with active schemas for the projectType
    const filteredFacilities = facilitiesResult.filter(facility => 
      facilitiesWithActiveSchemas.some(schema => 
        schema.facilityId === facility.facilityType
      )
    );
    
    console.log('📊 [getFacilities] Database query result:', {
      projectType,
      districtId,
      facilitiesCount: filteredFacilities.length,
      facilities: filteredFacilities.map(f => ({ id: f.id, name: f.name, type: f.facilityType }))
    });

    const response = {
      success: true,
      data: {
        facilities: filteredFacilities.map((facility) => ({
          id: facility.id,
          name: facility.name,
          facilityType: facility.facilityType,
          district: {
            id: facility.districtId,
            name: facility.districtName || 'Unknown District',
            province: {
              id: facility.provinceId || 0,
              name: facility.provinceName || 'Unknown Province',
            },
          },
        })),
      },
    };

    console.log('✅ [getFacilities] Response:', {
      projectType,
      districtId,
      facilitiesCount: response.data.facilities.length,
    });

    return c.json(response, HttpStatusCodes.OK);
    
  } catch (error) {
    console.error("❌ [getFacilities] Error fetching facilities:", error);
    return c.json(
      {
        success: false,
        data: {
          facilities: [],
        },
        error: "Internal server error",
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

export const createFacilitiesPlanning: AppRouteHandler<CreateFacilitiesPlanningRoute> = async (c) => {
  try {
    const body = await c.req.json();
    const { program, facilityId, reportingPeriodId, userId, formData } = body;

    if (!program || !facilityId || !reportingPeriodId || !userId) {
      return c.json(
        { success: false, error: "Missing required fields" },
        HttpStatusCodes.BAD_REQUEST,
      );
    }

    const facility = await db
      .select()
      .from(facilities)
      .where(eq(facilities.id, facilityId))
      .limit(1);

    if (facility.length === 0) {
      return c.json(
        { success: false, error: "Facility not found" },
        HttpStatusCodes.NOT_FOUND,
      );
    }

    const [newProject] = await db
      .insert(projects)
      .values({
        name: `${program} Plan - ${facility[0].name}`,
        code: `${String(program).toUpperCase().slice(0, 10)}`,
        projectType: program as any,
        facilityId,
        reportingPeriodId,
        userId,
        metadata: {
          facilityType: facility[0].facilityType,
          createdVia: "api",
          configurationSnapshot: formData,
        },
      })
      .returning();

    if (formData && newProject) {
      const activeSchema = await db
        .select()
        .from(formSchemas)
        .where(
          and(
            eq(formSchemas.projectType, program as any),
            eq(formSchemas.facilityType, facility[0].facilityType as any),
            eq(formSchemas.moduleType, 'planning' as any),
            eq(formSchemas.isActive, true),
          ),
        )
        .limit(1);

      if (activeSchema.length > 0) {
        await db.insert(schemaFormDataEntries).values({
          schemaId: activeSchema[0].id,
          entityId: newProject.id,
          entityType: "planning",
          projectId: newProject.id,
          facilityId,
          reportingPeriodId,
          formData,
          createdBy: userId,
        });
      }
    }

    return c.json(
      {
        success: true,
        data: { project: newProject, message: "Plan created successfully" },
      },
      HttpStatusCodes.CREATED,
    );
  } catch (error) {
    console.error("Error creating plan:", error);
    return c.json(
      { success: false, error: "Failed to create plan" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};


