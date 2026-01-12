# Budget Management API - Complete Skeleton Structure

```
budget-mgt-api/
│
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auth/
│   │   │   │   ├── auth.handlers.ts
│   │   │   │   ├── auth.index.ts
│   │   │   │   ├── auth.routes.ts
│   │   │   │   └── auth.types.ts
│   │   │   │
│   │   │   ├── users/
│   │   │   │   ├── users.handlers.ts
│   │   │   │   ├── users.index.ts
│   │   │   │   ├── users.routes.ts
│   │   │   │   └── users.types.ts
│   │   │   │
│   │   │   ├── districts/
│   │   │   │   ├── districts.handlers.ts      # (existing)
│   │   │   │   ├── districts.index.ts         # (existing)
│   │   │   │   ├── districts.routes.ts        # (existing)
│   │   │   │   └── districts.types.ts         # (existing)
│   │   │   │
│   │   │   ├── provinces/
│   │   │   │   ├── provinces.handlers.ts
│   │   │   │   ├── provinces.index.ts
│   │   │   │   ├── provinces.routes.ts
│   │   │   │   └── provinces.types.ts
│   │   │   │
│   │   │   ├── facilities/
│   │   │   │   ├── facilities.handlers.ts
│   │   │   │   ├── facilities.index.ts
│   │   │   │   ├── facilities.routes.ts
│   │   │   │   └── facilities.types.ts
│   │   │   │
│   │   │   ├── projects/
│   │   │   │   ├── projects.handlers.ts
│   │   │   │   ├── projects.index.ts
│   │   │   │   ├── projects.routes.ts
│   │   │   │   └── projects.types.ts
│   │   │   │
│   │   │   ├── reporting-periods/
│   │   │   │   ├── reporting-periods.handlers.ts
│   │   │   │   ├── reporting-periods.index.ts
│   │   │   │   ├── reporting-periods.routes.ts
│   │   │   │   └── reporting-periods.types.ts
│   │   │   │
│   │   │   ├── schemas/
│   │   │   │   ├── schemas.handlers.ts
│   │   │   │   ├── schemas.index.ts
│   │   │   │   ├── schemas.routes.ts
│   │   │   │   └── schemas.types.ts
│   │   │   │
│   │   │   ├── form-fields/
│   │   │   │   ├── form-fields.handlers.ts
│   │   │   │   ├── form-fields.index.ts
│   │   │   │   ├── form-fields.routes.ts
│   │   │   │   └── form-fields.types.ts
│   │   │   │
│   │   │   ├── categories/
│   │   │   │   ├── categories.handlers.ts
│   │   │   │   ├── categories.index.ts
│   │   │   │   ├── categories.routes.ts
│   │   │   │   └── categories.types.ts
│   │   │   │
│   │   │   ├── activities/
│   │   │   │   ├── activities.handlers.ts
│   │   │   │   ├── activities.index.ts
│   │   │   │   ├── activities.routes.ts
│   │   │   │   └── activities.types.ts
│   │   │   │
│   │   │   ├── events/
│   │   │   │   ├── events.handlers.ts
│   │   │   │   ├── events.index.ts
│   │   │   │   ├── events.routes.ts
│   │   │   │   └── events.types.ts
│   │   │   │
│   │   │   ├── event-mappings/
│   │   │   │   ├── event-mappings.handlers.ts
│   │   │   │   ├── event-mappings.index.ts
│   │   │   │   ├── event-mappings.routes.ts
│   │   │   │   └── event-mappings.types.ts
│   │   │   │
│   │   │   ├── planning/
│   │   │   │   ├── planning.handlers.ts
│   │   │   │   ├── planning.index.ts
│   │   │   │   ├── planning.routes.ts
│   │   │   │   └── planning.types.ts
│   │   │   │
│   │   │   ├── execution/
│   │   │   │   ├── execution.handlers.ts
│   │   │   │   ├── execution.index.ts
│   │   │   │   ├── execution.routes.ts
│   │   │   │   └── execution.types.ts
│   │   │   │
│   │   │   ├── statement-templates/
│   │   │   │   ├── statement-templates.handlers.ts
│   │   │   │   ├── statement-templates.index.ts
│   │   │   │   ├── statement-templates.routes.ts
│   │   │   │   └── statement-templates.types.ts
│   │   │   │
│   │   │   ├── financial-reports/
│   │   │   │   ├── financial-reports.handlers.ts
│   │   │   │   ├── financial-reports.index.ts
│   │   │   │   ├── financial-reports.routes.ts
│   │   │   │   └── financial-reports.types.ts
│   │   │   │
│   │   │   ├── statements/
│   │   │   │   ├── statements.handlers.ts
│   │   │   │   ├── statements.index.ts
│   │   │   │   ├── statements.routes.ts
│   │   │   │   └── statements.types.ts
│   │   │   │
│   │   │   ├── configurations/
│   │   │   │   ├── configurations.handlers.ts
│   │   │   │   ├── configurations.index.ts
│   │   │   │   ├── configurations.routes.ts
│   │   │   │   └── configurations.types.ts
│   │   │   │
│   │   │   ├── validation/
│   │   │   │   ├── validation.handlers.ts
│   │   │   │   ├── validation.index.ts
│   │   │   │   ├── validation.routes.ts
│   │   │   │   └── validation.types.ts
│   │   │   │
│   │   │   ├── computation/
│   │   │   │   ├── computation.handlers.ts
│   │   │   │   ├── computation.index.ts
│   │   │   │   ├── computation.routes.ts
│   │   │   │   └── computation.types.ts
│   │   │   │
│   │   │   ├── bulk/
│   │   │   │   ├── bulk.handlers.ts
│   │   │   │   ├── bulk.index.ts
│   │   │   │   ├── bulk.routes.ts
│   │   │   │   └── bulk.types.ts
│   │   │   │
│   │   │   ├── migration/
│   │   │   │   ├── migration.handlers.ts
│   │   │   │   ├── migration.index.ts
│   │   │   │   ├── migration.routes.ts
│   │   │   │   └── migration.types.ts
│   │   │   │
│   │   │   ├── analytics/
│   │   │   │   ├── analytics.handlers.ts
│   │   │   │   ├── analytics.index.ts
│   │   │   │   ├── analytics.routes.ts
│   │   │   │   └── analytics.types.ts
│   │   │   │
│   │   │   └── dashboard/
│   │   │       ├── dashboard.handlers.ts
│   │   │       ├── dashboard.index.ts
│   │   │       ├── dashboard.routes.ts
│   │   │       └── dashboard.types.ts
│   │   │
│   │   └── index.route.ts                     # (existing - needs updating)
│   │
│   ├── db/
│   │   ├── schema/
│   │   │   ├── index.ts                       # Export all schemas
│   │   │   ├── auth.ts                        # Auth-related tables
│   │   │   ├── core.ts                        # Core entities (users, projects, facilities)
│   │   │   ├── reference.ts                   # Reference data (provinces, districts)
│   │   │   ├── schema-driven.ts               # New schema-driven tables
│   │   │   ├── financial.ts                   # Financial reports and statements
│   │   │   ├── configuration.ts               # System configurations
│   │   │   └── audit.ts                       # Audit and logging tables
│   │   │
│   │   ├── migrations/
│   │   │   ├── 0001_initial_schema.sql
│   │   │   ├── 0002_schema_driven_tables.sql
│   │   │   ├── 0003_enhanced_financial_reports.sql
│   │   │   └── 0004_configuration_audit_tables.sql
│   │   │
│   │   ├── relations/
│   │   │   ├── index.ts                       # Export all relations
│   │   │   ├── core.relations.ts              # Core entity relations
│   │   │   ├── schema-driven.relations.ts     # Schema-driven relations
│   │   │   ├── financial.relations.ts         # Financial data relations
│   │   │   └── reference.relations.ts         # Reference data relations
│   │   │
│   │   ├── seeds/
│   │   │   ├── index.ts
│   │   │   ├── 01-provinces-districts.ts
│   │   │   ├── 02-facilities.ts
│   │   │   ├── 03-users-auth.ts
│   │   │   ├── 04-projects-periods.ts
│   │   │   ├── 05-events.ts
│   │   │   ├── 06-form-schemas.ts
│   │   │   ├── 07-categories-activities.ts
│   │   │   ├── 08-statement-templates.ts
│   │   │   └── 09-system-configurations.ts
│   │   │
│   │   └── index.ts                           # Database connection and query
│   │
│   ├── lib/
│   │   ├── types/
│   │   │   ├── index.ts                       # Export all types
│   │   │   ├── api.types.ts                   # Common API types
│   │   │   ├── auth.types.ts                  # Authentication types
│   │   │   ├── schema.types.ts                # Form schema types
│   │   │   ├── validation.types.ts            # Validation types
│   │   │   ├── computation.types.ts           # Computation engine types
│   │   │   └── reporting.types.ts             # Reporting types
│   │   │
│   │   ├── utils/
│   │   │   ├── index.ts
│   │   │   ├── validation.utils.ts            # Validation utilities
│   │   │   ├── computation.utils.ts           # Computation utilities
│   │   │   ├── schema.utils.ts                # Schema manipulation utilities
│   │   │   ├── date.utils.ts                  # Date handling utilities
│   │   │   ├── response.utils.ts              # Response formatting utilities
│   │   │   └── error.utils.ts                 # Error handling utilities
│   │   │
│   │   ├── services/
│   │   │   ├── index.ts
│   │   │   ├── auth.service.ts                # Authentication service
│   │   │   ├── schema.service.ts              # Form schema service
│   │   │   ├── validation.service.ts          # Validation engine service
│   │   │   ├── computation.service.ts         # Computation engine service
│   │   │   ├── reporting.service.ts           # Report generation service
│   │   │   ├── mapping.service.ts             # Event mapping service
│   │   │   ├── audit.service.ts               # Audit logging service
│   │   │   └── export.service.ts              # Data export service
│   │   │
│   │   ├── validators/
│   │   │   ├── index.ts
│   │   │   ├── common.validators.ts           # Common validation schemas
│   │   │   ├── form.validators.ts             # Form validation schemas
│   │   │   ├── financial.validators.ts        # Financial data validators
│   │   │   └── schema.validators.ts           # Schema definition validators
│   │   │
│   │   ├── constants/
│   │   │   ├── index.ts
│   │   │   ├── api.constants.ts               # API constants
│   │   │   ├── validation.constants.ts        # Validation constants
│   │   │   ├── computation.constants.ts       # Computation constants
│   │   │   └── reporting.constants.ts         # Reporting constants
│   │   │
│   │   ├── constants.ts                       # (existing - may need updating)
│   │   ├── types.ts                           # (existing - may need updating)
│   │   └── create-app.ts                      # (existing)
│   │
│   ├── middleware/
│   │   ├── index.ts
│   │   ├── auth.middleware.ts                 # JWT authentication middleware
│   │   ├── permission.middleware.ts           # Role-based access control
│   │   ├── validation.middleware.ts           # Request validation middleware
│   │   ├── rate-limit.middleware.ts           # Rate limiting middleware
│   │   ├── audit.middleware.ts                # Audit logging middleware
│   │   ├── error.middleware.ts                # Global error handling
│   │   ├── cache.middleware.ts                # Response caching middleware
│   │   └── cors.middleware.ts                 # CORS configuration
│   │
│   ├── app.ts                                 # (existing - needs updating)
│   ├── env.ts                                 # (existing)
│   └── index.ts                               # (existing)
│
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── validators/
│   │   └── middleware/
│   │
│   ├── integration/
│   │   ├── auth/
│   │   ├── schemas/
│   │   ├── planning/
│   │   ├── execution/
│   │   ├── reporting/
│   │   └── configurations/
│   │
│   └── fixtures/
│       ├── users.json
│       ├── projects.json
│       ├── form-schemas.json
│       ├── activities.json
│       └── financial-reports.json
│
├── docs/
│   ├── api/
│   │   ├── README.md
│   │   ├── authentication.md
│   │   ├── schema-engine.md
│   │   ├── planning-module.md
│   │   ├── execution-module.md
│   │   ├── reporting-module.md
│   │   └── configuration.md
│   │
│   ├── deployment/
│   │   ├── README.md
│   │   ├── environment-setup.md
│   │   ├── database-migration.md
│   │   └── production-checklist.md
│   │
│   └── development/
│       ├── README.md
│       ├── coding-standards.md
│       ├── testing-guidelines.md
│       └── contribution-guide.md
│
├── scripts/
│   ├── dev/
│   │   ├── setup-db.ts
│   │   ├── seed-data.ts
│   │   ├── reset-db.ts
│   │   └── generate-schemas.ts
│   │
│   ├── migration/
│   │   ├── migrate-legacy-data.ts
│   │   ├── validate-migration.ts
│   │   └── rollback-migration.ts
│   │
│   └── deployment/
│       ├── build.ts
│       ├── deploy.ts
│       └── health-check.ts
│
├── config/
│   ├── database.config.ts
│   ├── auth.config.ts
│   ├── redis.config.ts
│   ├── logging.config.ts
│   └── validation.config.ts
│
├── .env                                       # (existing)
├── .env.example
├── .env.test
├── .env.production
├── drizzle.config.ts                          # (existing)
├── pnpm-lock.yaml                             # (existing)
├── tsconfig.json                              # (existing)
├── jest.config.js
├── docker-compose.yml
├── Dockerfile
├── .gitignore
├── .prettierrc
├── .eslintrc.json
└── README.md
```

## Key File Templates and Examples

### 1. Updated API Index Route (`src/api/index.route.ts`)

```typescript
import { createRouter } from "@/api/lib/create-app";

// Import all route modules
import authRouter from "./routes/auth/auth.index";
import usersRouter from "./routes/users/users.index";
import provincesRouter from "./routes/provinces/provinces.index";
import districtsRouter from "./routes/districts/districts.index";
import facilitiesRouter from "./routes/facilities/facilities.index";
import projectsRouter from "./routes/projects/projects.index";
import reportingPeriodsRouter from "./routes/reporting-periods/reporting-periods.index";
import schemasRouter from "./routes/schemas/schemas.index";
import formFieldsRouter from "./routes/form-fields/form-fields.index";
import categoriesRouter from "./routes/categories/categories.index";
import activitiesRouter from "./routes/activities/activities.index";
import eventsRouter from "./routes/events/events.index";
import eventMappingsRouter from "./routes/event-mappings/event-mappings.index";
import planningRouter from "./routes/planning/planning.index";
import executionRouter from "./routes/execution/execution.index";
import statementTemplatesRouter from "./routes/statement-templates/statement-templates.index";
import financialReportsRouter from "./routes/financial-reports/financial-reports.index";
import statementsRouter from "./routes/statements/statements.index";
import configurationsRouter from "./routes/configurations/configurations.index";
import validationRouter from "./routes/validation/validation.index";
import computationRouter from "./routes/computation/computation.index";
import bulkRouter from "./routes/bulk/bulk.index";
import migrationRouter from "./routes/migration/migration.index";
import analyticsRouter from "./routes/analytics/analytics.index";
import dashboardRouter from "./routes/dashboard/dashboard.index";

const router = createRouter()
  // Authentication & User Management
  .route("/auth", authRouter)
  .route("/users", usersRouter)
  
  // Reference Data
  .route("/provinces", provincesRouter)
  .route("/districts", districtsRouter)
  .route("/facilities", facilitiesRouter)
  .route("/projects", projectsRouter)
  .route("/reporting-periods", reportingPeriodsRouter)
  
  // Schema-Driven Engine
  .route("/schemas", schemasRouter)
  .route("/form-fields", formFieldsRouter)
  .route("/categories", categoriesRouter)
  .route("/activities", activitiesRouter)
  .route("/events", eventsRouter)
  .route("/event-mappings", eventMappingsRouter)
  
  // Core Modules
  .route("/planning", planningRouter)
  .route("/execution", executionRouter)
  
  // Reporting & Statements
  .route("/statement-templates", statementTemplatesRouter)
  .route("/financial-reports", financialReportsRouter)
  .route("/statements", statementsRouter)
  
  // System Management
  .route("/configurations", configurationsRouter)
  .route("/validation", validationRouter)
  .route("/computation", computationRouter)
  
  // Bulk Operations & Migration
  .route("/bulk", bulkRouter)
  .route("/migration", migrationRouter)
  
  // Analytics & Dashboard
  .route("/analytics", analyticsRouter)
  .route("/dashboard", dashboardRouter);

export default router;
```

### 2. Example Schema Route Structure (`src/api/routes/schemas/schemas.types.ts`)

```typescript
import { z } from "@hono/zod-openapi";

// Enums
export const moduleTypeEnum = z.enum(['planning', 'execution', 'reporting']);
export const projectTypeEnum = z.enum(['HIV', 'Malaria', 'TB']);
export const facilityTypeEnum = z.enum(['hospital', 'health_center']);

// Form Schema Types
export const formDefinitionSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  sections: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    fields: z.array(z.any()), // Define proper field schema
    displayOrder: z.number(),
    conditions: z.array(z.any()).optional(),
  })),
  validation: z.array(z.any()),
  calculations: z.array(z.any()),
});

export const insertFormSchemaSchema = z.object({
  name: z.string().min(1).max(100),
  version: z.string().min(1).max(20),
  projectType: projectTypeEnum.optional(),
  facilityType: facilityTypeEnum.optional(),
  moduleType: moduleTypeEnum,
  isActive: z.boolean().default(true),
  schema: formDefinitionSchema,
  metadata: z.record(z.any()).optional(),
});

export const selectFormSchemaSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  version: z.string(),
  projectType: projectTypeEnum.nullable(),
  facilityType: facilityTypeEnum.nullable(),
  moduleType: moduleTypeEnum,
  isActive: z.boolean(),
  schema: formDefinitionSchema,
  metadata: z.record(z.any()).nullable(),
  createdBy: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const patchFormSchemaSchema = insertFormSchemaSchema.partial();

// Response schemas
export const formSchemaListResponseSchema = z.object({
  schemas: z.array(selectFormSchemaSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});
```

### 3. Example Service Structure (`src/lib/services/schema.service.ts`)

```typescript
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { formSchemas, formFields } from "@/db/schema";
import type { 
  InsertFormSchema, 
  SelectFormSchema, 
  FormDefinition 
} from "@/lib/types/schema.types";

export class SchemaService {
  async createSchema(data: InsertFormSchema): Promise<SelectFormSchema> {
    const [schema] = await db.insert(formSchemas)
      .values(data)
      .returning();
    
    return schema;
  }

  async getSchemaById(id: number): Promise<SelectFormSchema | null> {
    return await db.query.formSchemas.findFirst({
      where: eq(formSchemas.id, id),
      with: {
        formFields: {
          orderBy: [formFields.displayOrder],
        },
      },
    });
  }

  async getSchemasByType(
    projectType?: string,
    facilityType?: string,
    moduleType?: string
  ): Promise<SelectFormSchema[]> {
    const conditions = [];
    
    if (projectType) conditions.push(eq(formSchemas.projectType, projectType));
    if (facilityType) conditions.push(eq(formSchemas.facilityType, facilityType));
    if (moduleType) conditions.push(eq(formSchemas.moduleType, moduleType));

    return await db.query.formSchemas.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(formSchemas.createdAt)],
    });
  }

  async updateSchema(id: number, data: Partial<InsertFormSchema>): Promise<SelectFormSchema | null> {
    const [updated] = await db.update(formSchemas)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(formSchemas.id, id))
      .returning();
    
    return updated || null;
  }

  async deleteSchema(id: number): Promise<boolean> {
    const result = await db.delete(formSchemas)
      .where(eq(formSchemas.id, id));
    
    return result.rowCount > 0;
  }

  async validateFormData(schemaId: number, data: Record<string, any>): Promise<{
    isValid: boolean;
    errors: Array<{ field: string; message: string; }>;
    computedValues: Record<string, any>;
  }> {
    // Implementation for form validation logic
    // This would use the schema definition to validate against the data
    
    return {
      isValid: true,
      errors: [],
      computedValues: {},
    };
  }
}

export const schemaService = new SchemaService();
```

### 4. Database Schema Organization (`src/db/schema/index.ts`)

```typescript
// Export all schemas from organized files
export * from './auth';
export * from './core';
export * from './reference';
export * from './schema-driven';
export * from './financial';
export * from './configuration';
export * from './audit';

// Re-export for convenience
export {
  // Auth tables
  account,
  session,
  verification,
  
  // Core entities
  enhancedUsers,
  enhancedProjects,
  
  // Reference data
  provinces,
  districts,
  facilities,
  reportingPeriods,
  
  // Schema-driven tables
  formSchemas,
  formFields,
  schemaActivityCategories,
  dynamicActivities,
  configurableEventMappings,
  
  // Financial tables
  enhancedStatementTemplates,
  enhancedFinancialReports,
  schemaFormDataEntries,
  
  // Configuration
  systemConfigurations,
  configurationAuditLog,
  
  // Legacy compatibility
  events,
} from './schema-driven';
```

### 5. Middleware Structure (`src/middleware/auth.middleware.ts`)

```typescript
import { Context, Next } from "hono";
import jwt from "jsonwebtoken";
import { db } from "@/db";
import { enhancedUsers } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface AuthContext {
  user: {
    id: number;
    email: string;
    role: string;
    facilityId?: number;
    permissions: string[];
    projectAccess: number[];
  };
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized", message: "Missing or invalid authorization header" }, 401);
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    
    const user = await db.query.enhancedUsers.findFirst({
      where: eq(enhancedUsers.id, decoded.userId),
      with: {
        facility: true,
      },
    });

    if (!user || !user.isActive) {
      return c.json({ error: "Unauthorized", message: "User not found or inactive" }, 401);
    }

    // Update last login
    await db.update(enhancedUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(enhancedUsers.id, user.id));

    c.set("user", {
      id: user.id,
      email: user.email,
      role: user.role,
      facilityId: user.facilityId,
      permissions: user.permissions as string[] || [],
      projectAccess: user.projectAccess as number[] || [],
    });

    await next();
  } catch (error) {
    return c.json({ error: "Unauthorized", message: "Invalid or expired token" }, 401);
  }
}
```

## Implementation Priority Order

### Phase 1: Foundation (Week 1-2)
1. Set up database schema and migrations
2. Implement authentication system
3. Create basic CRUD for reference data (provinces, districts, facilities)
4. Set up middleware and basic error handling

### Phase 2: Schema Engine (Week 3-4)
1. Form schema management endpoints
2. Dynamic form field management
3. Activity categories and dynamic activities
4. Basic validation service

### Phase 3: Core Modules (Week 5-7)
1. Planning module with schema-driven forms
2. Execution module with balance calculations
3. Event mapping configuration
4. Computation engine

### Phase 4: Reporting (Week 8-9)
1. Statement templates management
2. Financial report generation
3. Report approval workflow
4. Export functionality

### Phase 5: Advanced Features (Week 10-12)
1. Bulk operations and data migration
2. Analytics and dashboard
3. Audit logging
4. Performance optimization

This skeleton provides a comprehensive structure that follows your existing patterns while implementing the schema-driven architecture. Each module is self-contained with clear separation of concerns, making it easier to develop and maintain.