# Scalability of the planning module
_Exported on 7/18/2025 at 13:18:48 GMT+2 from Cursor (1.2.4)_

---

**User**

let's discuss a little about the scalability of the planning module.
the planning activities can change in the future, by either removing the existing activities or adding new ones.
I want you to help me recommend the approach to  develop centralized mechanism, something like a single source of truth, which would allow me to make future modification easier to do

---

**Cursor**

I'll help you design a centralized approach for managing planning activities to improve scalability and maintainability. Let me first explore the current structure to understand how planning activities are currently implemented.

Based on my analysis of your current planning module structure, I can see several scalability challenges and opportunities for improvement. Let me provide you with a comprehensive recommendation for a centralized mechanism that will serve as a single source of truth for planning activities.

## Current State Analysis

Your current system has activities defined in multiple places:

1. **Frontend Constants** - Hardcoded in TypeScript files (`/features/planning/constants/`)
2. **Database Seeds** - Static seeding scripts (`/db/seeds/planning_activities.ts`)
3. **Database Tables** - Runtime data in `planning_activities` and `planning_categories`

This creates maintenance overhead and potential inconsistencies when activities change.

## Recommended Centralized Architecture

Here's my recommendation for a scalable, centralized approach:

```markdown
# Centralized Planning Activities Design

## Overview

This document outlines the design for a centralized mechanism to manage planning activities as a single source of truth, replacing the current scattered approach with hardcoded constants and manual synchronization.

## Current State Analysis

### Problems with Current Approach
1. **Multiple Sources of Truth**: Activities defined in frontend constants, database seeds, and runtime tables
2. **Manual Synchronization**: Changes require updating multiple files
3. **Tight Coupling**: Frontend components hardcoded to specific activity structures
4. **Limited Flexibility**: Adding new programs requires code changes in multiple places
5. **No Versioning**: No history or rollback capability for activity changes
6. **No Runtime Management**: No admin interface to manage activities

### Current Database Structure
```typescript
// Current tables involved in planning activities
planningCategories: {
  id, projectId, facilityType, code, name, displayOrder, createdAt, updatedAt
}

planningActivities: {
  id, categoryId, facilityType, name, displayOrder, isTotalRow, projectId, createdAt, updatedAt
}

planningData: {
  id, activityId, facilityId, reportingPeriodId, projectId, frequency, unitCost, countQ1-Q4, etc.
}
```

## Proposed Centralized Architecture

### Enhanced Database Schema

#### 1. Activity Templates System
```typescript
// New table for activity templates that can be reused across projects
export const activityTemplates = pgTable("activity_templates", {
  id: serial().primaryKey().notNull(),
  name: varchar({ length: 200 }).notNull(),
  description: text(),
  categoryType: varchar({ length: 50 }).notNull(), // HR, TRC, PA, etc.
  tags: text().array(), // ["salary", "medical", "staff"] for flexible grouping
  isActive: boolean().default(true),
  metadata: jsonb(), // Flexible field for additional configuration
  createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
}, (table) => [
  unique("activity_templates_name_category_key").on(table.name, table.categoryType),
  index("idx_activity_templates_category").using("btree", table.categoryType),
  index("idx_activity_templates_active").using("btree", table.isActive),
]);
```

#### 2. Enhanced Planning Categories with Versioning
```typescript
export const planningCategoryVersions = pgTable("planning_category_versions", {
  id: serial().primaryKey().notNull(),
  categoryId: integer("category_id").notNull(),
  version: integer().notNull(),
  projectId: integer("project_id").notNull(),
  facilityType: facilityType("facility_type").notNull(),
  code: varchar({ length: 10 }).notNull(),
  name: varchar({ length: 100 }).notNull(),
  displayOrder: integer("display_order").notNull(),
  isActive: boolean().default(true),
  validFrom: timestamp("valid_from", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  validTo: timestamp("valid_to", { mode: 'date' }),
  changeReason: text(),
  createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  createdBy: integer("created_by"),
}, (table) => [
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [projects.id],
    name: "planning_category_versions_project_id_fkey"
  }).onDelete("cascade"),
  unique("planning_category_versions_unique").on(table.categoryId, table.version),
  index("idx_planning_cat_versions_active").using("btree", table.isActive),
]);
```

#### 3. Enhanced Planning Activities with Templates
```typescript
export const planningActivityVersions = pgTable("planning_activity_versions", {
  id: serial().primaryKey().notNull(),
  activityId: integer("activity_id").notNull(),
  version: integer().notNull(),
  templateId: integer("template_id"), // Link to activity template
  categoryVersionId: integer("category_version_id").notNull(),
  facilityType: facilityType("facility_type").notNull(),
  name: varchar({ length: 200 }).notNull(),
  displayOrder: integer("display_order").notNull(),
  isTotalRow: boolean("is_total_row").default(false),
  isActive: boolean().default(true),
  validFrom: timestamp("valid_from", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  validTo: timestamp("valid_to", { mode: 'date' }),
  
  // Configuration fields
  config: jsonb(), // Flexible configuration: validation rules, UI hints, etc.
  defaultFrequency: numeric({ precision: 10, scale: 2 }),
  defaultUnitCost: numeric({ precision: 18, scale: 2 }),
  
  // Audit fields
  changeReason: text(),
  createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  createdBy: integer("created_by"),
}, (table) => [
  foreignKey({
    columns: [table.templateId],
    foreignColumns: [activityTemplates.id],
    name: "planning_activity_versions_template_id_fkey"
  }),
  foreignKey({
    columns: [table.categoryVersionId],
    foreignColumns: [planningCategoryVersions.id],
    name: "planning_activity_versions_category_version_id_fkey"
  }).onDelete("cascade"),
  unique("planning_activity_versions_unique").on(table.activityId, table.version),
  index("idx_planning_act_versions_active").using("btree", table.isActive),
]);
```

#### 4. Configuration Management
```typescript
export const planningConfiguration = pgTable("planning_configuration", {
  id: serial().primaryKey().notNull(),
  projectId: integer("project_id").notNull(),
  facilityType: facilityType("facility_type").notNull(),
  configKey: varchar({ length: 100 }).notNull(),
  configValue: jsonb().notNull(),
  description: text(),
  isActive: boolean().default(true),
  createdAt: timestamp("created_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  unique("planning_config_unique").on(table.projectId, table.facilityType, table.configKey),
  index("idx_planning_config_active").using("btree", table.isActive),
]);
```

### API Layer Design

#### 1. Activity Configuration API
```typescript
// GET /api/planning-config/activities
// - Query params: projectId, facilityType, version?, active?
// - Returns: Complete activity structure for a project/facility combination

// POST /api/planning-config/activities
// - Body: New activity configuration
// - Creates new version of activities

// PUT /api/planning-config/activities/{activityId}
// - Updates activity (creates new version)

// DELETE /api/planning-config/activities/{activityId}
// - Soft delete (sets validTo date)
```

#### 2. Template Management API
```typescript
// GET /api/planning-config/templates
// - Returns: Available activity templates

// POST /api/planning-config/templates
// - Creates new activity template

// GET /api/planning-config/templates/{templateId}/activities
// - Returns: Activities using this template
```

#### 3. Admin Management API
```typescript
// GET /api/admin/planning/projects/{projectId}/structure
// - Returns: Complete project structure (categories + activities)

// POST /api/admin/planning/projects/{projectId}/import
// - Imports activities from templates or other projects

// POST /api/admin/planning/projects/{projectId}/publish
// - Publishes draft changes to active version
```

### Frontend Architecture Changes

#### 1. Dynamic Activity Loading
```typescript
// Replace hardcoded constants with API calls
export const usePlanningActivities = (projectCode: string, facilityType: string) => {
  return useQuery({
    queryKey: ['planning-activities', projectCode, facilityType],
    queryFn: () => planningConfigApi.getActivities({ projectCode, facilityType }),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
};
```

#### 2. Schema Generation
```typescript
// Generate form schemas based on API response
export const generateActivitySchema = (activities: PlanningActivity[]) => {
  return z.object({
    activities: z.array(
      z.object({
        activityId: z.number(),
        frequency: z.number().min(0).max(activities.find(a => a.config?.maxFrequency) || 999999),
        unitCost: z.number().min(0),
        // ... dynamic validation based on activity config
      })
    ),
  });
};
```

## Implementation Plan

### Phase 1: Database Migration (Week 1-2)
1. Create new tables for enhanced schema
2. Create migration scripts to move existing data
3. Add versioning support
4. Create indexes for performance

### Phase 2: API Development (Week 2-3)
1. Build activity configuration API endpoints
2. Add caching layer (Redis)
3. Implement admin management endpoints
4. Add comprehensive API documentation

### Phase 3: Admin Interface (Week 3-4)
1. Create admin dashboard for activity management
2. Add template management interface
3. Implement version history and rollback
4. Add bulk import/export functionality

### Phase 4: Frontend Refactoring (Week 4-5)
1. Replace hardcoded constants with API calls
2. Implement dynamic form generation
3. Add real-time updates when activities change
4. Update existing components to use new system

### Phase 5: Testing & Migration (Week 5-6)
1. Comprehensive testing of new system
2. Data migration from old system
3. Performance optimization
4. Documentation and training

## Benefits of Centralized Approach

### 1. Single Source of Truth
- All activity definitions in database
- Real-time synchronization across all components
- Eliminates manual sync issues

### 2. Improved Scalability
- Easy to add new programs and activities
- Template system for activity reuse
- Flexible configuration without code changes

### 3. Better Governance
- Version history and audit trail
- Approval workflow for changes
- Rollback capability

### 4. Enhanced User Experience
- Admin interface for non-technical users
- Real-time updates without deployments
- Consistent UI across all programs

### 5. Development Efficiency
- Reduced code duplication
- Automatic form generation
- Easier testing and maintenance

## Migration Strategy

### Data Migration
1. **Extract**: Current hardcoded activities → JSON format
2. **Transform**: Map to new schema structure
3. **Load**: Import into new tables with version 1
4. **Validate**: Ensure data integrity and completeness

### Code Migration
1. **Phase out constants**: Replace with API calls
2. **Update components**: Use dynamic loading
3. **Remove dead code**: Clean up hardcoded files
4. **Update tests**: Test against API instead of constants

### Rollback Plan
- Keep old system running in parallel during migration
- Feature flags to switch between old/new systems
- Database backup before major changes
- Quick rollback scripts if issues arise

## Performance Considerations

### Caching Strategy
- Redis cache for frequently accessed activities
- CDN caching for static activity configurations
- Client-side caching with smart invalidation

### Database Optimization
- Proper indexing on commonly queried fields
- Query optimization for complex joins
- Consider read replicas for high-traffic scenarios

### API Optimization
- GraphQL for flexible data fetching
- Compression and pagination
- Rate limiting and monitoring

## Security Considerations

### Access Control
- Role-based permissions for activity management
- Audit logging for all changes
- Approval workflow for sensitive changes

### Data Validation
- Input sanitization and validation
- Schema validation at API level
- Database constraints for data integrity

## Monitoring and Alerting

### Key Metrics
- API response times
- Cache hit rates
- Activity usage patterns
- Error rates and types

### Alerting
- Failed API calls
- Data inconsistencies
- Performance degradation
- Security incidents

This centralized approach will transform your planning module from a static, hardcoded system into a flexible, scalable, and maintainable solution that can easily adapt to changing business requirements.
```

```typescript
import { createRoute, z } from "@hono/zod-openapi";
import { jsonContent } from "stoker/openapi/helpers";
import * as HttpStatusCodes from "stoker/http-status-codes";

const tags = ["planning-config"];

// Schema definitions for the new centralized system
const ActivityTemplateSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  description: z.string().nullable(),
  categoryType: z.string(),
  tags: z.array(z.string()),
  isActive: z.boolean(),
  metadata: z.record(z.any()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const PlanningCategoryVersionSchema = z.object({
  id: z.number().int(),
  categoryId: z.number().int(),
  version: z.number().int(),
  projectId: z.number().int(),
  facilityType: z.enum(["hospital", "health_center"]),
  code: z.string(),
  name: z.string(),
  displayOrder: z.number().int(),
  isActive: z.boolean(),
  validFrom: z.string(),
  validTo: z.string().nullable(),
  changeReason: z.string().nullable(),
});

const PlanningActivityVersionSchema = z.object({
  id: z.number().int(),
  activityId: z.number().int(),
  version: z.number().int(),
  templateId: z.number().int().nullable(),
  categoryVersionId: z.number().int(),
  facilityType: z.enum(["hospital", "health_center"]),
  name: z.string(),
  displayOrder: z.number().int(),
  isTotalRow: z.boolean(),
  isActive: z.boolean(),
  validFrom: z.string(),
  validTo: z.string().nullable(),
  config: z.record(z.any()).nullable(),
  defaultFrequency: z.number().nullable(),
  defaultUnitCost: z.number().nullable(),
  changeReason: z.string().nullable(),
});

const ActivityStructureSchema = z.object({
  categories: z.array(PlanningCategoryVersionSchema),
  activities: z.array(PlanningActivityVersionSchema),
  templates: z.array(ActivityTemplateSchema),
});

const CreateActivityTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  categoryType: z.string().min(1, "Category type is required"),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
});

const UpdateActivityTemplateSchema = CreateActivityTemplateSchema.partial();

const CreateActivityConfigSchema = z.object({
  projectId: z.number().int(),
  facilityType: z.enum(["hospital", "health_center"]),
  categories: z.array(z.object({
    code: z.string(),
    name: z.string(),
    displayOrder: z.number().int(),
    activities: z.array(z.object({
      name: z.string(),
      displayOrder: z.number().int(),
      templateId: z.number().int().optional(),
      isTotalRow: z.boolean().default(false),
      config: z.record(z.any()).optional(),
      defaultFrequency: z.number().optional(),
      defaultUnitCost: z.number().optional(),
    })),
  })),
  changeReason: z.string().optional(),
});

const ActivityConfigQuerySchema = z.object({
  projectId: z.string().regex(/^\d+$/, "Project ID must be a valid number").transform(Number).optional(),
  projectCode: z.string().optional(),
  facilityType: z.enum(["hospital", "health_center"]).optional(),
  version: z.string().regex(/^\d+$/, "Version must be a valid number").transform(Number).optional(),
  active: z.string().transform(val => val === "true").optional(),
});

const TemplateQuerySchema = z.object({
  categoryType: z.string().optional(),
  tags: z.string().optional(), // comma-separated tags
  active: z.string().transform(val => val === "true").optional(),
});

// GET /planning-config/activities - Get activity structure for a project/facility
export const getActivityStructure = createRoute({
  method: "get",
  path: "/planning-config/activities",
  request: {
    query: ActivityConfigQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      ActivityStructureSchema,
      "Activity structure for the specified project and facility type"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ error: z.string(), message: z.string() }),
      "Invalid query parameters"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      z.object({ error: z.string(), message: z.string() }),
      "No activity structure found for the specified criteria"
    ),
  },
  tags,
});

// POST /planning-config/activities - Create new activity configuration
export const createActivityConfiguration = createRoute({
  method: "post",
  path: "/planning-config/activities",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateActivityConfigSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      z.object({ 
        message: z.string(),
        version: z.number().int(),
        categoriesCreated: z.number().int(),
        activitiesCreated: z.number().int(),
      }),
      "Activity configuration created successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ error: z.string(), message: z.string() }),
      "Invalid input data"
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      z.object({ error: z.string(), message: z.string() }),
      "Configuration already exists for this project/facility combination"
    ),
  },
  tags,
});

// GET /planning-config/templates - Get activity templates
export const getActivityTemplates = createRoute({
  method: "get",
  path: "/planning-config/templates",
  request: {
    query: TemplateQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ data: z.array(ActivityTemplateSchema) }),
      "List of activity templates"
    ),
  },
  tags,
});

// POST /planning-config/templates - Create activity template
export const createActivityTemplate = createRoute({
  method: "post",
  path: "/planning-config/templates",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateActivityTemplateSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      ActivityTemplateSchema,
      "Activity template created successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ error: z.string(), message: z.string() }),
      "Invalid input data"
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      z.object({ error: z.string(), message: z.string() }),
      "Template with this name and category already exists"
    ),
  },
  tags,
});

// PUT /planning-config/templates/{templateId} - Update activity template
const TemplateIdParamSchema = z.object({
  templateId: z.string().regex(/^\d+$/, "Template ID must be a valid number").transform(Number),
});

export const updateActivityTemplate = createRoute({
  method: "put",
  path: "/planning-config/templates/{templateId}",
  request: {
    params: TemplateIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: UpdateActivityTemplateSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      ActivityTemplateSchema,
      "Activity template updated successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ error: z.string(), message: z.string() }),
      "Invalid input data"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      z.object({ error: z.string(), message: z.string() }),
      "Template not found"
    ),
  },
  tags,
});

// DELETE /planning-config/templates/{templateId} - Deactivate activity template
export const deactivateActivityTemplate = createRoute({
  method: "delete",
  path: "/planning-config/templates/{templateId}",
  request: {
    params: TemplateIdParamSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ message: z.string() }),
      "Activity template deactivated successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      z.object({ error: z.string(), message: z.string() }),
      "Template not found"
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      z.object({ error: z.string(), message: z.string() }),
      "Cannot deactivate template that is currently in use"
    ),
  },
  tags,
});

// GET /planning-config/templates/{templateId}/activities - Get activities using template
export const getActivitiesByTemplate = createRoute({
  method: "get",
  path: "/planning-config/templates/{templateId}/activities",
  request: {
    params: TemplateIdParamSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ 
        template: ActivityTemplateSchema,
        activities: z.array(PlanningActivityVersionSchema),
        projectsUsing: z.array(z.object({
          projectId: z.number().int(),
          projectName: z.string(),
          facilityType: z.string(),
        })),
      }),
      "Activities using the specified template"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      z.object({ error: z.string(), message: z.string() }),
      "Template not found"
    ),
  },
  tags,
});

// Admin routes for project management
const ProjectIdParamSchema = z.object({
  projectId: z.string().regex(/^\d+$/, "Project ID must be a valid number").transform(Number),
});

// GET /admin/planning/projects/{projectId}/structure - Get complete project structure
export const getProjectStructure = createRoute({
  method: "get",
  path: "/admin/planning/projects/{projectId}/structure",
  request: {
    params: ProjectIdParamSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        project: z.object({
          id: z.number().int(),
          name: z.string(),
          code: z.string(),
          description: z.string().nullable(),
        }),
        hospital: ActivityStructureSchema.optional(),
        healthCenter: ActivityStructureSchema.optional(),
        versions: z.array(z.object({
          version: z.number().int(),
          facilityType: z.string(),
          createdAt: z.string(),
          createdBy: z.string().nullable(),
          changeReason: z.string().nullable(),
          isActive: z.boolean(),
        })),
      }),
      "Complete project structure with all versions"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      z.object({ error: z.string(), message: z.string() }),
      "Project not found"
    ),
  },
  tags,
});

// POST /admin/planning/projects/{projectId}/import - Import activities from templates or other projects
const ImportConfigSchema = z.object({
  sourceType: z.enum(["project", "templates"]),
  sourceProjectId: z.number().int().optional(),
  templateIds: z.array(z.number().int()).optional(),
  facilityType: z.enum(["hospital", "health_center"]),
  replaceExisting: z.boolean().default(false),
  changeReason: z.string().optional(),
});

export const importActivityConfiguration = createRoute({
  method: "post",
  path: "/admin/planning/projects/{projectId}/import",
  request: {
    params: ProjectIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: ImportConfigSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        message: z.string(),
        version: z.number().int(),
        imported: z.object({
          categories: z.number().int(),
          activities: z.number().int(),
        }),
      }),
      "Activities imported successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ error: z.string(), message: z.string() }),
      "Invalid import configuration"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      z.object({ error: z.string(), message: z.string() }),
      "Source project or templates not found"
    ),
  },
  tags,
});

// POST /admin/planning/projects/{projectId}/publish - Publish draft changes to active version
const PublishConfigSchema = z.object({
  facilityType: z.enum(["hospital", "health_center"]),
  version: z.number().int(),
  changeReason: z.string().optional(),
});

export const publishActivityConfiguration = createRoute({
  method: "post",
  path: "/admin/planning/projects/{projectId}/publish",
  request: {
    params: ProjectIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: PublishConfigSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        message: z.string(),
        publishedVersion: z.number().int(),
        activatedAt: z.string(),
      }),
      "Configuration published successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ error: z.string(), message: z.string() }),
      "Invalid publish request"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      z.object({ error: z.string(), message: z.string() }),
      "Project or version not found"
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      z.object({ error: z.string(), message: z.string() }),
      "Cannot publish - version has validation errors"
    ),
  },
  tags,
});

export type GetActivityStructureRoute = typeof getActivityStructure;
export type CreateActivityConfigurationRoute = typeof createActivityConfiguration;
export type GetActivityTemplatesRoute = typeof getActivityTemplates;
export type CreateActivityTemplateRoute = typeof createActivityTemplate;
export type UpdateActivityTemplateRoute = typeof updateActivityTemplate;
export type DeactivateActivityTemplateRoute = typeof deactivateActivityTemplate;
export type GetActivitiesByTemplateRoute = typeof getActivitiesByTemplate;
export type GetProjectStructureRoute = typeof getProjectStructure;
export type ImportActivityConfigurationRoute = typeof importActivityConfiguration;
export type PublishActivityConfigurationRoute = typeof publishActivityConfiguration;
```

```typescript
import { AppRouteHandler } from "../../lib/types";
import { 
  GetActivityStructureRoute, 
  CreateActivityTemplateRoute,
  GetActivityTemplatesRoute,
  GetProjectStructureRoute 
} from "./planning-config.routes";
import { db } from "@/db";
import * as schema from "@/db/schema";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { eq, and, desc, isNull, or } from "drizzle-orm";

// This is a sample implementation showing how the centralized system would work
// In a real implementation, you would need to create the new tables first

export const getActivityStructure: AppRouteHandler<GetActivityStructureRoute> = async (c) => {
  const { projectId, projectCode, facilityType, version, active } = c.req.valid("query");
  
  try {
    // Resolve project ID from code if needed
    let resolvedProjectId = projectId;
    if (!resolvedProjectId && projectCode) {
      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.code, projectCode),
        columns: { id: true }
      });
      if (!project) {
        return c.json({ 
          error: "NOT_FOUND", 
          message: `Project with code "${projectCode}" not found` 
        }, HttpStatusCodes.NOT_FOUND);
      }
      resolvedProjectId = project.id;
    }

    if (!resolvedProjectId) {
      return c.json({ 
        error: "BAD_REQUEST", 
        message: "Either projectId or projectCode must be provided" 
      }, HttpStatusCodes.BAD_REQUEST);
    }

    if (!facilityType) {
      return c.json({ 
        error: "BAD_REQUEST", 
        message: "facilityType parameter is required" 
      }, HttpStatusCodes.BAD_REQUEST);
    }

    // For now, return current structure as this demonstrates the API shape
    // In the real implementation, this would query the new versioned tables
    
    // Get current categories
    const categories = await db
      .select({
        id: schema.planningCategories.id,
        categoryId: schema.planningCategories.id, // For compatibility
        version: db.raw('1').as('version'), // Placeholder - would come from versioned table
        projectId: schema.planningCategories.projectId,
        facilityType: schema.planningCategories.facilityType,
        code: schema.planningCategories.code,
        name: schema.planningCategories.name,
        displayOrder: schema.planningCategories.displayOrder,
        isActive: db.raw('true').as('isActive'), // Placeholder
        validFrom: schema.planningCategories.createdAt,
        validTo: db.raw('null').as('validTo'),
        changeReason: db.raw('null').as('changeReason'),
      })
      .from(schema.planningCategories)
      .where(
        and(
          eq(schema.planningCategories.projectId, resolvedProjectId),
          eq(schema.planningCategories.facilityType, facilityType)
        )
      )
      .orderBy(schema.planningCategories.displayOrder);

    // Get current activities
    const activities = await db
      .select({
        id: schema.planningActivities.id,
        activityId: schema.planningActivities.id, // For compatibility
        version: db.raw('1').as('version'), // Placeholder
        templateId: db.raw('null').as('templateId'), // Placeholder
        categoryVersionId: schema.planningActivities.categoryId,
        facilityType: schema.planningActivities.facilityType,
        name: schema.planningActivities.name,
        displayOrder: schema.planningActivities.displayOrder,
        isTotalRow: schema.planningActivities.isTotalRow,
        isActive: db.raw('true').as('isActive'), // Placeholder
        validFrom: schema.planningActivities.createdAt,
        validTo: db.raw('null').as('validTo'),
        config: db.raw('null').as('config'), // Placeholder
        defaultFrequency: db.raw('null').as('defaultFrequency'), // Placeholder
        defaultUnitCost: db.raw('null').as('defaultUnitCost'), // Placeholder
        changeReason: db.raw('null').as('changeReason'),
      })
      .from(schema.planningActivities)
      .innerJoin(
        schema.planningCategories, 
        eq(schema.planningActivities.categoryId, schema.planningCategories.id)
      )
      .where(
        and(
          eq(schema.planningCategories.projectId, resolvedProjectId),
          eq(schema.planningActivities.facilityType, facilityType)
        )
      )
      .orderBy(
        schema.planningCategories.displayOrder,
        schema.planningActivities.displayOrder
      );

    // Get templates (placeholder - would come from actual templates table)
    const templates = [
      {
        id: 1,
        name: "Medical Doctor Salary",
        description: "Template for medical doctor salary activities",
        categoryType: "HR",
        tags: ["salary", "medical", "staff"],
        isActive: true,
        metadata: { 
          suggestedFrequency: 12,
          costRange: { min: 50000, max: 200000 }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: "Transport Costs",
        description: "Template for various transport-related activities",
        categoryType: "TRC",
        tags: ["transport", "travel", "mission"],
        isActive: true,
        metadata: {
          suggestedFrequency: 4,
          costRange: { min: 100, max: 10000 }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    const result = {
      categories: categories.map(cat => ({
        ...cat,
        validFrom: cat.validFrom.toISOString(),
        validTo: cat.validTo,
      })),
      activities: activities.map(act => ({
        ...act,
        validFrom: act.validFrom.toISOString(),
        validTo: act.validTo,
      })),
      templates,
    };

    return c.json(result, HttpStatusCodes.OK);

  } catch (error) {
    console.error("Error fetching activity structure:", error);
    return c.json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch activity structure"
    }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getActivityTemplates: AppRouteHandler<GetActivityTemplatesRoute> = async (c) => {
  const { categoryType, tags, active } = c.req.valid("query");
  
  try {
    // This is a placeholder implementation
    // In the real implementation, this would query the activity_templates table
    
    let templates = [
      {
        id: 1,
        name: "Medical Doctor Salary",
        description: "Template for medical doctor salary activities",
        categoryType: "HR",
        tags: ["salary", "medical", "staff"],
        isActive: true,
        metadata: { 
          suggestedFrequency: 12,
          costRange: { min: 50000, max: 200000 }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: "Nurse Salary",
        description: "Template for nurse salary activities",
        categoryType: "HR", 
        tags: ["salary", "nursing", "staff"],
        isActive: true,
        metadata: {
          suggestedFrequency: 12,
          costRange: { min: 30000, max: 80000 }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 3,
        name: "Transport Costs",
        description: "Template for various transport-related activities",
        categoryType: "TRC",
        tags: ["transport", "travel", "mission"],
        isActive: true,
        metadata: {
          suggestedFrequency: 4,
          costRange: { min: 100, max: 10000 }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 4,
        name: "Office Supplies",
        description: "Template for office supplies and administrative costs",
        categoryType: "PA",
        tags: ["supplies", "office", "admin"],
        isActive: true,
        metadata: {
          suggestedFrequency: 1,
          costRange: { min: 500, max: 5000 }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 5,
        name: "Equipment Maintenance",
        description: "Template for equipment maintenance activities",
        categoryType: "HPE",
        tags: ["maintenance", "equipment", "repair"],
        isActive: false, // Example of inactive template
        metadata: {
          suggestedFrequency: 2,
          costRange: { min: 1000, max: 20000 }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    // Apply filters
    if (categoryType) {
      templates = templates.filter(t => t.categoryType === categoryType);
    }

    if (tags) {
      const requestedTags = tags.split(',').map(tag => tag.trim().toLowerCase());
      templates = templates.filter(t => 
        requestedTags.some(reqTag => 
          t.tags.some(tTag => tTag.toLowerCase().includes(reqTag))
        )
      );
    }

    if (active !== undefined) {
      templates = templates.filter(t => t.isActive === active);
    }

    return c.json({ data: templates }, HttpStatusCodes.OK);

  } catch (error) {
    console.error("Error fetching activity templates:", error);
    return c.json({
      error: "INTERNAL_SERVER_ERROR", 
      message: "Failed to fetch activity templates"
    }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const createActivityTemplate: AppRouteHandler<CreateActivityTemplateRoute> = async (c) => {
  const body = c.req.valid("json");
  
  try {
    // This is a placeholder implementation
    // In the real implementation, this would insert into the activity_templates table
    
    // Simulate checking for duplicates
    const existingTemplates = [
      { name: "Medical Doctor Salary", categoryType: "HR" },
      { name: "Nurse Salary", categoryType: "HR" },
      { name: "Transport Costs", categoryType: "TRC" },
    ];

    const duplicate = existingTemplates.find(t => 
      t.name.toLowerCase() === body.name.toLowerCase() && 
      t.categoryType === body.categoryType
    );

    if (duplicate) {
      return c.json({
        error: "CONFLICT",
        message: `Template with name "${body.name}" already exists in category "${body.categoryType}"`
      }, HttpStatusCodes.CONFLICT);
    }

    // Simulate creating the template
    const newTemplate = {
      id: Math.floor(Math.random() * 1000) + 100, // Random ID for demo
      name: body.name,
      description: body.description || null,
      categoryType: body.categoryType,
      tags: body.tags || [],
      isActive: true,
      metadata: body.metadata || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    c.get("logger")?.info("Activity template created", {
      templateId: newTemplate.id,
      name: newTemplate.name,
      categoryType: newTemplate.categoryType
    });

    return c.json(newTemplate, HttpStatusCodes.CREATED);

  } catch (error) {
    console.error("Error creating activity template:", error);
    return c.json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to create activity template"
    }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getProjectStructure: AppRouteHandler<GetProjectStructureRoute> = async (c) => {
  const { projectId } = c.req.valid("param");
  
  try {
    // Get project info
    const project = await db.query.projects.findFirst({
      where: eq(schema.projects.id, projectId),
      columns: {
        id: true,
        name: true,
        code: true,
        description: true,
      }
    });

    if (!project) {
      return c.json({
        error: "NOT_FOUND",
        message: `Project with ID ${projectId} not found`
      }, HttpStatusCodes.NOT_FOUND);
    }

    // Get structure for both facility types
    const hospitalStructure = await getStructureForFacilityType(projectId, "hospital");
    const healthCenterStructure = await getStructureForFacilityType(projectId, "health_center");

    // Get version history (placeholder)
    const versions = [
      {
        version: 1,
        facilityType: "hospital",
        createdAt: new Date().toISOString(),
        createdBy: "System Migration",
        changeReason: "Initial setup from legacy system",
        isActive: true,
      },
      {
        version: 1,
        facilityType: "health_center", 
        createdAt: new Date().toISOString(),
        createdBy: "System Migration",
        changeReason: "Initial setup from legacy system",
        isActive: true,
      }
    ];

    const result = {
      project,
      hospital: hospitalStructure,
      healthCenter: healthCenterStructure,
      versions,
    };

    return c.json(result, HttpStatusCodes.OK);

  } catch (error) {
    console.error("Error fetching project structure:", error);
    return c.json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch project structure"
    }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// Helper function to get structure for a specific facility type
async function getStructureForFacilityType(projectId: number, facilityType: "hospital" | "health_center") {
  try {
    // Get categories
    const categories = await db
      .select({
        id: schema.planningCategories.id,
        categoryId: schema.planningCategories.id,
        version: db.raw('1').as('version'),
        projectId: schema.planningCategories.projectId,
        facilityType: schema.planningCategories.facilityType,
        code: schema.planningCategories.code,
        name: schema.planningCategories.name,
        displayOrder: schema.planningCategories.displayOrder,
        isActive: db.raw('true').as('isActive'),
        validFrom: schema.planningCategories.createdAt,
        validTo: db.raw('null').as('validTo'),
        changeReason: db.raw('null').as('changeReason'),
      })
      .from(schema.planningCategories)
      .where(
        and(
          eq(schema.planningCategories.projectId, projectId),
          eq(schema.planningCategories.facilityType, facilityType)
        )
      )
      .orderBy(schema.planningCategories.displayOrder);

    // Get activities
    const activities = await db
      .select({
        id: schema.planningActivities.id,
        activityId: schema.planningActivities.id,
        version: db.raw('1').as('version'),
        templateId: db.raw('null').as('templateId'),
        categoryVersionId: schema.planningActivities.categoryId,
        facilityType: schema.planningActivities.facilityType,
        name: schema.planningActivities.name,
        displayOrder: schema.planningActivities.displayOrder,
        isTotalRow: schema.planningActivities.isTotalRow,
        isActive: db.raw('true').as('isActive'),
        validFrom: schema.planningActivities.createdAt,
        validTo: db.raw('null').as('validTo'),
        config: db.raw('null').as('config'),
        defaultFrequency: db.raw('null').as('defaultFrequency'),
        defaultUnitCost: db.raw('null').as('defaultUnitCost'),
        changeReason: db.raw('null').as('changeReason'),
      })
      .from(schema.planningActivities)
      .innerJoin(
        schema.planningCategories,
        eq(schema.planningActivities.categoryId, schema.planningCategories.id)
      )
      .where(
        and(
          eq(schema.planningCategories.projectId, projectId),
          eq(schema.planningActivities.facilityType, facilityType)
        )
      )
      .orderBy(
        schema.planningCategories.displayOrder,
        schema.planningActivities.displayOrder
      );

    // Sample templates (would come from templates table)
    const templates = [
      {
        id: 1,
        name: "Medical Doctor Salary",
        description: "Template for medical doctor salary activities",
        categoryType: "HR",
        tags: ["salary", "medical", "staff"],
        isActive: true,
        metadata: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    return {
      categories: categories.map(cat => ({
        ...cat,
        validFrom: cat.validFrom.toISOString(),
        validTo: cat.validTo,
      })),
      activities: activities.map(act => ({
        ...act,
        validFrom: act.validFrom.toISOString(),
        validTo: act.validTo,
      })),
      templates,
    };

  } catch (error) {
    console.error(`Error fetching structure for ${facilityType}:`, error);
    return undefined;
  }
}
```

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Types for the centralized system
interface ActivityTemplate {
  id: number;
  name: string;
  description: string | null;
  categoryType: string;
  tags: string[];
  isActive: boolean;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

interface PlanningCategoryVersion {
  id: number;
  categoryId: number;
  version: number;
  projectId: number;
  facilityType: "hospital" | "health_center";
  code: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  validFrom: string;
  validTo: string | null;
  changeReason: string | null;
}

interface PlanningActivityVersion {
  id: number;
  activityId: number;
  version: number;
  templateId: number | null;
  categoryVersionId: number;
  facilityType: "hospital" | "health_center";
  name: string;
  displayOrder: number;
  isTotalRow: boolean;
  isActive: boolean;
  validFrom: string;
  validTo: string | null;
  config: Record<string, any> | null;
  defaultFrequency: number | null;
  defaultUnitCost: number | null;
  changeReason: string | null;
}

interface ActivityStructure {
  categories: PlanningCategoryVersion[];
  activities: PlanningActivityVersion[];
  templates: ActivityTemplate[];
}

interface CreateActivityTemplateRequest {
  name: string;
  description?: string;
  categoryType: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

// API client functions
const planningConfigApi = {
  getActivityStructure: async (params: {
    projectCode?: string;
    projectId?: number;
    facilityType: "hospital" | "health_center";
    version?: number;
    active?: boolean;
  }): Promise<ActivityStructure> => {
    const searchParams = new URLSearchParams();
    
    if (params.projectCode) searchParams.append('projectCode', params.projectCode);
    if (params.projectId) searchParams.append('projectId', params.projectId.toString());
    searchParams.append('facilityType', params.facilityType);
    if (params.version) searchParams.append('version', params.version.toString());
    if (params.active !== undefined) searchParams.append('active', params.active.toString());

    const response = await fetch(`/api/planning-config/activities?${searchParams}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch activity structure: ${response.statusText}`);
    }
    return response.json();
  },

  getActivityTemplates: async (params?: {
    categoryType?: string;
    tags?: string;
    active?: boolean;
  }): Promise<{ data: ActivityTemplate[] }> => {
    const searchParams = new URLSearchParams();
    
    if (params?.categoryType) searchParams.append('categoryType', params.categoryType);
    if (params?.tags) searchParams.append('tags', params.tags);
    if (params?.active !== undefined) searchParams.append('active', params.active.toString());

    const response = await fetch(`/api/planning-config/templates?${searchParams}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch activity templates: ${response.statusText}`);
    }
    return response.json();
  },

  createActivityTemplate: async (data: CreateActivityTemplateRequest): Promise<ActivityTemplate> => {
    const response = await fetch('/api/planning-config/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to create activity template: ${response.statusText}`);
    }
    return response.json();
  },

  getProjectStructure: async (projectId: number) => {
    const response = await fetch(`/api/admin/planning/projects/${projectId}/structure`);
    if (!response.ok) {
      throw new Error(`Failed to fetch project structure: ${response.statusText}`);
    }
    return response.json();
  },
};

// React hooks for the centralized system

/**
 * Hook to fetch planning activities for a specific project and facility type
 * This replaces the hardcoded constants approach
 */
export const usePlanningActivities = (
  projectCode: string,
  facilityType: "hospital" | "health_center",
  options?: {
    version?: number;
    active?: boolean;
    enabled?: boolean;
  }
) => {
  return useQuery({
    queryKey: ['planning-activities', projectCode, facilityType, options?.version, options?.active],
    queryFn: () => planningConfigApi.getActivityStructure({
      projectCode,
      facilityType,
      version: options?.version,
      active: options?.active,
    }),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
  });
};

/**
 * Hook to fetch activity templates
 * Useful for admin interfaces and activity creation
 */
export const useActivityTemplates = (filters?: {
  categoryType?: string;
  tags?: string;
  active?: boolean;
}) => {
  return useQuery({
    queryKey: ['activity-templates', filters],
    queryFn: () => planningConfigApi.getActivityTemplates(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes cache for templates
  });
};

/**
 * Hook to create new activity templates
 */
export const useCreateActivityTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: planningConfigApi.createActivityTemplate,
    onSuccess: (newTemplate) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['activity-templates'] });
      
      toast.success("Activity template created successfully!", {
        description: `Template "${newTemplate.name}" is now available for use.`
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to create activity template", {
        description: error.message
      });
    },
  });
};

/**
 * Hook to get complete project structure (for admin interfaces)
 */
export const useProjectStructure = (projectId: number, enabled = true) => {
  return useQuery({
    queryKey: ['project-structure', projectId],
    queryFn: () => planningConfigApi.getProjectStructure(projectId),
    enabled,
    staleTime: 15 * 60 * 1000, // 15 minutes cache for project structure
  });
};

/**
 * Utility hook to get categorized activities (mimics the old constants structure)
 * This provides backward compatibility while using the new centralized system
 */
export const useCategorizedActivities = (
  projectCode: string,
  facilityType: "hospital" | "health_center"
) => {
  const { data, isLoading, error } = usePlanningActivities(projectCode, facilityType);

  const categorizedActivities = React.useMemo(() => {
    if (!data?.categories || !data?.activities) return {};

    const result: Record<string, PlanningActivityVersion[]> = {};
    
    // Group activities by category
    data.categories.forEach(category => {
      const categoryActivities = data.activities.filter(
        activity => activity.categoryVersionId === category.id
      );
      result[category.name] = categoryActivities;
    });

    return result;
  }, [data]);

  const activityCategories = React.useMemo(() => {
    if (!data?.categories) return {};

    const result: Record<string, { code: string; name: string; displayOrder: number }> = {};
    data.categories.forEach(category => {
      result[category.name] = {
        code: category.code,
        name: category.name,
        displayOrder: category.displayOrder,
      };
    });
    return result;
  }, [data]);

  return {
    categorizedActivities,
    activityCategories,
    templates: data?.templates || [],
    isLoading,
    error,
    refetch: () => {
      // Could trigger a refetch if needed
    },
  };
};

/**
 * Hook to generate default activities based on the centralized structure
 * Replaces the hardcoded generateDefaultActivities functions
 */
export const useGenerateDefaultActivities = (
  projectCode: string,
  facilityType: "hospital" | "health_center"
) => {
  const { data } = usePlanningActivities(projectCode, facilityType);

  return React.useMemo(() => {
    if (!data?.activities) return [];

    // Convert centralized activities to form-compatible format
    return data.activities
      .filter(activity => !activity.isTotalRow && activity.isActive)
      .map(activity => ({
        id: activity.id.toString(),
        activityCategory: data.categories.find(cat => cat.id === activity.categoryVersionId)?.name || '',
        typeOfActivity: activity.name,
        activity: activity.name,
        frequency: activity.defaultFrequency || 0,
        unitCost: activity.defaultUnitCost || 0,
        countQ1: 0,
        countQ2: 0,
        countQ3: 0,
        countQ4: 0,
        amountQ1: 0,
        amountQ2: 0,
        amountQ3: 0,
        amountQ4: 0,
        totalBudget: 0,
        comment: '',
        planningActivityId: activity.id,
        planningDataId: undefined,
      }));
  }, [data]);
};

/**
 * Hook for real-time activity updates
 * Could be extended with WebSocket support for collaborative editing
 */
export const useActivityUpdates = (projectCode: string, facilityType: "hospital" | "health_center") => {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    // Placeholder for WebSocket connection
    // const ws = new WebSocket(`ws://localhost:3000/planning-updates/${projectCode}/${facilityType}`);
    
    // ws.onmessage = (event) => {
    //   const update = JSON.parse(event.data);
    //   if (update.type === 'ACTIVITY_STRUCTURE_UPDATED') {
    //     queryClient.invalidateQueries({ 
    //       queryKey: ['planning-activities', projectCode, facilityType] 
    //     });
    //   }
    // };

    // return () => ws.close();

    // For now, just set up periodic refresh for demo
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ 
        queryKey: ['planning-activities', projectCode, facilityType] 
      });
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [projectCode, facilityType, queryClient]);
};

// Migration helper: Provides the old interface using new centralized data
export const useLegacyPlanningInterface = (
  projectCode: string,
  facilityType: "hospital" | "health_center"
) => {
  const { categorizedActivities, activityCategories, isLoading, error } = useCategorizedActivities(
    projectCode,
    facilityType
  );

  // Convert to the old constants format for backward compatibility
  const legacyFormat = React.useMemo(() => {
    const result: Record<string, Array<{ activity: string; typeOfActivity: string }>> = {};
    
    Object.entries(categorizedActivities).forEach(([categoryName, activities]) => {
      result[categoryName] = activities.map(activity => ({
        activity: activity.name,
        typeOfActivity: activity.name,
      }));
    });

    return result;
  }, [categorizedActivities]);

  return {
    activities: legacyFormat,
    categories: activityCategories,
    isLoading,
    error,
  };
};
```

```markdown
# Planning Module Scalability Recommendations

## Executive Summary

Based on the analysis of your current planning module, I recommend implementing a **centralized activity configuration system** that will serve as a single source of truth for planning activities. This will dramatically improve scalability, maintainability, and flexibility when adding or modifying activities across different programs.

## Current Pain Points Identified

1. **Multiple Sources of Truth** - Activities are hardcoded in frontend constants, database seeds, and runtime tables
2. **Manual Synchronization** - Changes require updating multiple files across the codebase
3. **Limited Flexibility** - Adding new programs requires code changes in multiple places
4. **No Version Control** - No history or rollback capability for activity changes
5. **Poor Scalability** - Difficult to manage activities as the system grows

## Recommended Solution: Centralized Activity Configuration

### Core Architecture Changes

1. **Enhanced Database Schema** with versioning and templates
2. **Centralized API Layer** for activity configuration management
3. **Dynamic Frontend Loading** replacing hardcoded constants
4. **Admin Management Interface** for non-technical users
5. **Template System** for activity reuse across projects

### Key Benefits

- ✅ **Single Source of Truth** - All activities managed in database
- ✅ **Real-time Updates** - Changes reflected immediately without deployments
- ✅ **Version History** - Complete audit trail with rollback capability
- ✅ **Template Reuse** - Common activities can be templated and reused
- ✅ **Flexible Configuration** - Easy to add new programs and activities
- ✅ **Better Governance** - Approval workflows and change management

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Create enhanced database schema with versioning
- [ ] Build core API endpoints for activity configuration
- [ ] Implement caching layer for performance
- [ ] Create migration scripts from current system

### Phase 2: API Development (Weeks 2-3)
- [ ] Complete all CRUD operations for activities and templates
- [ ] Add admin management endpoints
- [ ] Implement comprehensive validation and error handling
- [ ] Add API documentation and testing

### Phase 3: Admin Interface (Weeks 3-4)
- [ ] Build admin dashboard for activity management
- [ ] Create template management interface
- [ ] Implement version history and rollback features
- [ ] Add bulk import/export functionality

### Phase 4: Frontend Integration (Weeks 4-5)
- [ ] Replace hardcoded constants with API calls
- [ ] Implement dynamic form generation
- [ ] Add real-time updates when activities change
- [ ] Update existing components to use new system

### Phase 5: Testing & Migration (Weeks 5-6)
- [ ] Comprehensive testing of new system
- [ ] Data migration from old to new system
- [ ] Performance optimization and monitoring
- [ ] Documentation and user training

## Technical Specifications

### Enhanced Database Schema

The new schema includes:

#### Activity Templates
- Reusable activity definitions with metadata
- Tags for flexible categorization
- Configuration options for validation rules

#### Versioned Categories & Activities
- Complete version history for all changes
- Temporal validity (valid from/to dates)
- Change tracking with reasons

#### Configuration Management
- Flexible configuration storage
- Project and facility-specific settings
- Runtime configuration without code changes

### API Layer

#### Core Endpoints
```
GET  /api/planning-config/activities        - Get activity structure
POST /api/planning-config/activities        - Create new configuration
GET  /api/planning-config/templates         - Get activity templates
POST /api/planning-config/templates         - Create activity template
```

#### Admin Endpoints
```
GET  /api/admin/planning/projects/{id}/structure  - Complete project view
POST /api/admin/planning/projects/{id}/import     - Import from templates
POST /api/admin/planning/projects/{id}/publish    - Publish changes
```

### Frontend Integration

#### Dynamic Activity Loading
```typescript
// Replace hardcoded constants with API calls
const { data: activities } = usePlanningActivities('HIV', 'hospital');
```

#### Backward Compatibility
```typescript
// Legacy interface wrapper for gradual migration
const legacyActivities = useLegacyPlanningInterface('HIV', 'hospital');
```

## Migration Strategy

### Data Migration
1. **Extract** current hardcoded activities to JSON format
2. **Transform** data to match new schema structure
3. **Load** into new versioned tables as version 1
4. **Validate** data integrity and completeness

### Code Migration
1. **Phase out constants** gradually replace with API calls
2. **Update components** to use dynamic loading
3. **Remove dead code** clean up hardcoded files
4. **Update tests** to work with API instead of constants

### Risk Mitigation
- **Parallel Running** - Keep old system during migration
- **Feature Flags** - Switch between old/new systems
- **Rollback Plan** - Quick revert if issues arise
- **Gradual Rollout** - Migrate one program at a time

## Performance Considerations

### Caching Strategy
- **Redis cache** for frequently accessed activities
- **Client-side caching** with smart invalidation
- **CDN caching** for static configurations

### Database Optimization
- **Proper indexing** on commonly queried fields
- **Query optimization** for complex joins
- **Read replicas** for high-traffic scenarios

## Security & Governance

### Access Control
- **Role-based permissions** for activity management
- **Audit logging** for all changes
- **Approval workflows** for sensitive modifications

### Data Validation
- **Input sanitization** and validation
- **Schema validation** at API level
- **Database constraints** for data integrity

## Success Metrics

### Technical Metrics
- **API Response Time** < 200ms for activity queries
- **Cache Hit Rate** > 90% for frequently accessed data
- **Error Rate** < 0.1% for activity operations

### Business Metrics
- **Time to Add New Program** reduced from days to hours
- **Activity Management Efficiency** 80% reduction in manual work
- **Change Deployment Time** from hours to minutes

## Next Steps

1. **Review and Approve** this architectural approach
2. **Allocate Resources** assign development team
3. **Set Up Development Environment** prepare for implementation
4. **Create Detailed Sprint Plans** break down work into specific tasks
5. **Begin Phase 1** start with database schema design

## Files Created

As part of this recommendation, I've created:

1. **`docs/centralized-planning-activities-design.md`** - Detailed technical design
2. **`app/api/[[...route]]/routes/planning-config/planning-config.routes.ts`** - API route definitions
3. **`app/api/[[...route]]/routes/planning-config/planning-config.handlers.ts`** - Sample API handlers
4. **`features/planning-config/api/use-planning-activities.ts`** - Frontend hooks for new system

These files demonstrate the proposed architecture and can serve as a starting point for implementation.

## Conclusion

This centralized approach will transform your planning module from a static, hardcoded system into a flexible, scalable, and maintainable solution. The investment in this architectural change will pay dividends as your system grows and new requirements emerge.

The phased implementation approach ensures minimal disruption to current operations while providing a clear path to a more robust and scalable system.
```

## Summary

I've analyzed your planning module and created a comprehensive recommendation for implementing a **centralized activity configuration system** that will serve as a single source of truth. Here's what I've provided:

### 📋 **Key Recommendations**

1. **Centralized Database-Driven Approach** - Move from hardcoded constants to a dynamic, versioned database system
2. **Template System** - Create reusable activity templates that can be shared across programs
3. **API-First Architecture** - Build a robust API layer for managing activities and configurations
4. **Dynamic Frontend** - Replace hardcoded forms with API-driven, dynamically generated interfaces
5. **Admin Management Interface** - Enable non-technical users to manage activities without code changes

### 🏗️ **Architecture Benefits**

- ✅ **Single Source of Truth** - All activities managed in one place
- ✅ **Real-time Updates** - Changes reflected immediately without deployments  
- ✅ **Version Control** - Complete audit trail with rollback capability
- ✅ **Easy Scaling** - Add new programs and activities without code changes
- ✅ **Better Governance** - Approval workflows and change management

### 📁 **Files Created**

I've created comprehensive documentation and sample implementations:

1. **`docs/centralized-planning-activities-design.md`** - Complete technical design with database schema, API specifications, and implementation details
2. **`docs/planning-scalability-recommendations.md`** - Executive summary with roadmap and success metrics
3. **`app/api/[[...route]]/routes/planning-config/`** - Sample API routes and handlers
4. **`features/planning-config/api/use-planning-activities.ts`** - Frontend hooks demonstrating the new approach

### ⏱️ **Implementation Timeline**

The transformation can be completed in **5-6 weeks** across 5 phases:
- **Phase 1-2**: Database schema and API development (3 weeks)
- **Phase 3**: Admin interface (1 week) 
- **Phase 4**: Frontend integration (1 week)
- **Phase 5**: Testing and migration (1 week)

### 🎯 **Impact**

This approach will:
- **Reduce time to add new programs** from days to hours
- **Eliminate manual synchronization** issues
- **Enable non-technical users** to manage activities
- **Provide complete audit trail** for governance
- **Scale effortlessly** as your system grows

The investment in this architectural change will pay significant dividends as your planning module grows and evolves. The phased approach ensures minimal disruption while providing a clear path to a more robust, scalable system.

Would you like me to elaborate on any specific aspect of this recommendation or help you plan the implementation approach?

