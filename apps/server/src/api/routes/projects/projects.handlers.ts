import { eq, and } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { db } from "@/api/db";
import { projects, facilities, reportingPeriods, users } from "@/api/db/schema";
import type { AppRouteHandler } from "@/api/lib/types";
import type { 
  ListRoute, 
  GetOneRoute, 
  CreateRoute, 
  UpdateRoute, 
  PatchRoute, 
  RemoveRoute,
} from "./projects.routes";


export const list: AppRouteHandler<ListRoute> = async (c) => {
  const query = c.req.query();
  
  // Build where conditions based on query parameters
  const conditions = [];
  if (query.projectType) {
    conditions.push(eq(projects.projectType, query.projectType as any));
  }
  if (query.facilityId) {
    conditions.push(eq(projects.facilityId, parseInt(query.facilityId)));
  }
  if (query.status) {
    conditions.push(eq(projects.status, query.status));
  }
  if (query.userId) {
    conditions.push(eq(projects.userId, parseInt(query.userId)));
  }
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  const data = await db.query.projects.findMany({
    where: whereClause,
    with: {
      facility: true,
      reportingPeriod: true,
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
  
  // Transform data to match DTO structure
  const transformedData = data.map(project => ({
    ...project,
    createdAt: project.createdAt?.toISOString(),
    updatedAt: project.updatedAt?.toISOString(),
    reportingPeriod: project.reportingPeriod || undefined,
  }));
  
  return c.json(transformedData);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.param();
  const projectId = parseInt(id);
  
  const data = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: {
      facility: true,
      reportingPeriod: true,
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!data) {
    return c.json(
      { message: "Project not found" },
      HttpStatusCodes.NOT_FOUND
    );
  }
  
  const transformedData = {
    ...data,
    createdAt: data.createdAt?.toISOString(),
    updatedAt: data.updatedAt?.toISOString(),
    reportingPeriod: data.reportingPeriod || undefined,
  };
  
  return c.json(transformedData, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const body = await c.req.json();
  
  try {
    // Check for duplicates
    const existing = await db.query.projects.findFirst({
      where: (projects, { or, eq }) => or(
        eq(projects.name, body.name),
        eq(projects.code, body.code)
      ),
    });
    
    if (existing) {
      return c.json(
        { message: "Project with this name or code already exists" },
        HttpStatusCodes.CONFLICT
      );
    }
    
    // Verify related entities exist
    // const facility = await db.query.facilities.findFirst({
    //   where: eq(facilities.id, body.facilityId),
    // });
    
    // if (!facility) {
    //   return c.json(
    //     { message: "Facility not found" },
    //     HttpStatusCodes.BAD_REQUEST
    //   );
    // }
    
    // const user = await db.query.users.findFirst({
    //   where: eq(users.id, body.userId),
    // });
    
    // if (!user) {
    //   return c.json(
    //     { message: "User not found" },
    //     HttpStatusCodes.BAD_REQUEST
    //   );
    // }
    
    // if (body.reportingPeriodId) {
    //   const period = await db.query.reportingPeriods.findFirst({
    //     where: eq(reportingPeriods.id, body.reportingPeriodId),
    //   });
      
    //   if (!period) {
    //     return c.json(
    //       { message: "Reporting period not found" },
    //       HttpStatusCodes.BAD_REQUEST
    //     );
    //   }
    // }
    
    const [newProject] = await db.insert(projects)
      .values(body)
      .returning();
    
    // Fetch with relations
    const projectWithRelations = await db.query.projects.findFirst({
      where: eq(projects.id, newProject.id),
      with: {
        facility: true,
        reportingPeriod: true,
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
    
    const transformedData = {
      ...projectWithRelations!,
      createdAt: projectWithRelations!.createdAt?.toISOString(),
      updatedAt: projectWithRelations!.updatedAt?.toISOString(),
      reportingPeriod: projectWithRelations!.reportingPeriod || undefined,
    };
    
    return c.json(transformedData, HttpStatusCodes.CREATED);
  } catch (error) {
    return c.json(
      { message: "Failed to create project" },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
  const { id } = c.req.param();
  const projectId = parseInt(id);
  const body = await c.req.json();
  
  try {
    const existing = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });
    
    if (!existing) {
      return c.json(
        { message: "Project not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }
    
    const [updatedProject] = await db.update(projects)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();
    
    // Fetch with relations
    const projectWithRelations = await db.query.projects.findFirst({
      where: eq(projects.id, updatedProject.id),
      with: {
        facility: true,
        reportingPeriod: true,
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
    
    const transformedData = {
      ...projectWithRelations!,
      createdAt: projectWithRelations!.createdAt?.toISOString(),
      updatedAt: projectWithRelations!.updatedAt?.toISOString(),
      reportingPeriod: projectWithRelations!.reportingPeriod || undefined,
    };
    
    return c.json(transformedData, HttpStatusCodes.OK);
  } catch (error) {
    return c.json(
      { message: "Failed to update project" },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.param();
  const projectId = parseInt(id);
  const body = await c.req.json();
  
  try {
    const existing = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });
    
    if (!existing) {
      return c.json(
        { message: "Project not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }
    
    const [updatedProject] = await db.update(projects)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();
    
    // Fetch with relations
    const projectWithRelations = await db.query.projects.findFirst({
      where: eq(projects.id, updatedProject.id),
      with: {
        facility: true,
        reportingPeriod: true,
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
    
    const transformedData = {
      ...projectWithRelations!,
      createdAt: projectWithRelations!.createdAt?.toISOString(),
      updatedAt: projectWithRelations!.updatedAt?.toISOString(),
      reportingPeriod: projectWithRelations!.reportingPeriod || undefined,
    };
    
    return c.json(transformedData, HttpStatusCodes.OK);
  } catch (error) {
    return c.json(
      { message: "Failed to update project" },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.param();
  const projectId = parseInt(id);
  
  try {
    const existing = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });
    
    if (!existing) {
      return c.json(
        { message: "Project not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }
    
    // Check for dependent data before deletion
    // This would check for planning data, execution data, reports, etc.
    // For now, we'll just delete
    
    await db.delete(projects).where(eq(projects.id, projectId));
    
    return c.body(null, HttpStatusCodes.NO_CONTENT);
  } catch (error) {
    return c.json(
      { message: "Cannot delete project with existing data" },
      HttpStatusCodes.CONFLICT
    );
  }
};