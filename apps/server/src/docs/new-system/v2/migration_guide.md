# Migration Guide: From Hard-coded to Schema-driven System

## Overview
This guide outlines the migration process from your current hard-coded system to the new schema-driven architecture. The migration involves three main phases:

1. **Database Schema Migration** - Create new tables and migrate existing data
2. **Data Migration** - Transform hard-coded configurations into database records
3. **Application Code Migration** - Update application logic to use schema-driven approach

## Phase 1: Database Schema Migration

### Step 1.1: Create New Tables
Execute the enhanced database schema to create new tables:

```sql
-- Create new enums
CREATE TYPE "form_field_type" AS ENUM ('text', 'number', 'currency', 'percentage', 'date', 'select', 'multiselect', 'checkbox', 'textarea', 'calculated', 'readonly');
CREATE TYPE "validation_type" AS ENUM ('required', 'min', 'max', 'minLength', 'maxLength', 'pattern', 'custom');
CREATE TYPE "mapping_type" AS ENUM ('DIRECT', 'COMPUTED', 'AGGREGATED');
CREATE TYPE "report_status" AS ENUM ('draft', 'submitted', 'approved', 'rejected');
CREATE TYPE "module_type" AS ENUM ('planning', 'execution', 'reporting');

-- Execute enhanced-tables.ts schema creation
-- (All table definitions from the enhanced schema)
```

### Step 1.2: Migrate Existing Users
```sql
-- Migrate users to enhanced_users
INSERT INTO enhanced_users (
  id, name, email, email_verified, role, facility_id, 
  permissions, project_access, is_active, created_at, updated_at
)
SELECT 
  id, name, email, email_verified, role, facility_id,
  '{"canManageConfig": false, "canApproveReports": false}'::jsonb as permissions,
  '[]'::jsonb as project_access,
  true as is_active,
  created_at, updated_at
FROM users;

-- Update foreign key references
UPDATE account SET user_id = user_id; -- References now point to enhanced_users
UPDATE session SET user_id = user_id; -- References now point to enhanced_users
```

### Step 1.3: Migrate Projects
```sql
-- Migrate projects to enhanced_projects
INSERT INTO enhanced_projects (
  id, name, status, code, description, project_type, 
  facility_id, reporting_period_id, user_id, metadata, 
  created_at, updated_at
)
SELECT 
  id, name, status, code, description, project_type,
  facility_id, reporting_period_id, user_id,
  '{}'::jsonb as metadata,
  created_at, updated_at
FROM projects;
```

## Phase 2: Data Migration - Transform Hard-coded Configurations

### Step 2.1: Create Form Schemas for Each Module

```sql
-- Create Planning Module Schema for HIV Health Centers
INSERT INTO form_schemas (name, version, project_type, facility_type, module_type, schema, created_by)
VALUES (
  'HIV Health Center Planning Form',
  '1.0',
  'HIV',
  'health_center',
  'planning',
  '{
    "formId": "hiv_hc_planning",
    "title": "HIV Health Center Planning",
    "version": "1.0",
    "sections": [
      {
        "id": "hr_section",
        "title": "Human Resources (HR)",
        "order": 1,
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "comment"]
      },
      {
        "id": "trc_section", 
        "title": "Travel Related Costs (TRC)",
        "order": 2,
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "comment"]
      }
    ]
  }'::jsonb,
  1
);

-- Create similar schemas for HIV Hospital, TB, Malaria, etc.
-- Repeat for execution and reporting modules
```

### Step 2.2: Migrate Activity Categories

```sql
-- Create schema-driven activity categories from hard-coded TypeScript files
INSERT INTO schema_activity_categories (project_type, facility_type, code, name, display_order)
VALUES 
  ('HIV', 'health_center', 'HR', 'Human Resources (HR)', 1),
  ('HIV', 'health_center', 'TRC', 'Travel Related Costs (TRC)', 2),
  ('HIV', 'health_center', 'HPE', 'Health Products & Equipment (HPE)', 3),
  ('HIV', 'health_center', 'PAC', 'Program Administration Costs (PAC)', 4),
  
  ('HIV', 'hospital', 'HR', 'Human Resources (HR)', 1),
  ('HIV', 'hospital', 'TRC', 'Travel Related Costs (TRC)', 2),
  ('HIV', 'hospital', 'HPE', 'Health Products & Equipment (HPE)', 3),
  ('HIV', 'hospital', 'PAC', 'Program Administration Costs (PAC)', 4),
  
  ('TB', 'hospital', 'HR', 'Human Resources (HR)', 1),
  ('TB', 'hospital', 'TRC', 'Travel Related Costs (TRC)', 2);
```

### Step 2.3: Migrate Activities from TypeScript to Database

```sql
-- Migrate HIV Health Center activities
INSERT INTO dynamic_activities (category_id, project_type, facility_type, name, activity_type, display_order)
SELECT 
  sac.id as category_id,
  'HIV' as project_type,
  'health_center' as facility_type,
  'Provide salaries for health facilities staff (DHs, HCs)' as name,
  'HC Nurses (A1) Salary' as activity_type,
  1 as display_order
FROM schema_activity_categories sac 
WHERE sac.project_type = 'HIV' 
  AND sac.facility_type = 'health_center' 
  AND sac.code = 'HR';

INSERT INTO dynamic_activities (category_id, project_type, facility_type, name, activity_type, display_order)
SELECT 
  sac.id as category_id,
  'HIV' as project_type,
  'health_center' as facility_type,
  'Provide salaries for health facilities staff (DHs, HCs)' as name,
  'HC Lab Technician (A1) Salary' as activity_type,
  2 as display_order
FROM schema_activity_categories sac 
WHERE sac.project_type = 'HIV' 
  AND sac.facility_type = 'health_center' 
  AND sac.code = 'HR';

-- Continue for all activities from HEALTH_CENTER_ACTIVITIES, HOSPITAL_ACTIVITIES, TB_ACTIVITIES
-- This replaces the hard-coded TypeScript files
```

### Step 2.4: Migrate Event Mappings

```sql
-- Create configurable event mappings from hard-coded mappings
INSERT INTO configurable_event_mappings (event_id, activity_id, mapping_type, is_active)
SELECT 
  e.id as event_id,
  da.id as activity_id,
  'DIRECT' as mapping_type,
  true as is_active
FROM events e
CROSS JOIN dynamic_activities da
WHERE e.code = 'COMPENSATION_EMPLOYEES' 
  AND da.activity_type LIKE '%Salary%';

-- Add more sophisticated mappings based on your current manual mappings
-- Replace hard-coded eventStatementMapping with database records
```

## Phase 3: Application Code Migration

### Step 3.1: Replace Hard-coded Activity Files

Remove these TypeScript files and replace with database queries:
- `HEALTH_CENTER_ACTIVITIES.ts`
- `HOSPITAL_ACTIVITIES.ts` 
- `TB_ACTIVITIES.ts`

Replace with dynamic activity fetching:

```typescript
// Instead of importing hard-coded activities
// import { HEALTH_CENTER_ACTIVITIES } from './activities/hiv-health-center'

// Use schema-driven approach
export async function getActivitiesForProject(
  projectType: ProjectType, 
  facilityType: FacilityType
) {
  return await db
    .select({
      category: schemaActivityCategories.name,
      activity: dynamicActivities.name,
      activityType: dynamicActivities.activityType,
      displayOrder: dynamicActivities.displayOrder
    })
    .from(dynamicActivities)
    .innerJoin(schemaActivityCategories, 
      eq(dynamicActivities.categoryId, schemaActivityCategories.id))
    .where(
      and(
        eq(dynamicActivities.projectType, projectType),
        eq(dynamicActivities.facilityType, facilityType),
        eq(dynamicActivities.isActive, true)
      )
    )
    .orderBy(
      schemaActivityCategories.displayOrder,
      dynamicActivities.displayOrder
    );
}
```

### Step 3.2: Create Dynamic Form Rendering

```typescript
// Replace hard-coded form components with schema-driven rendering
export async function getFormSchema(
  projectType: ProjectType,
  facilityType: FacilityType, 
  moduleType: ModuleType
) {
  const schema = await db
    .select()
    .from(formSchemas)
    .where(
      and(
        eq(formSchemas.projectType, projectType),
        eq(formSchemas.facilityType, facilityType),
        eq(formSchemas.moduleType, moduleType),
        eq(formSchemas.isActive, true)
      )
    )
    .limit(1);
    
  return schema[0]?.schema;
}

// Dynamic form field rendering
export function renderFormField(field: FormField, value: any) {
  switch (field.fieldType) {
    case 'currency':
      return <CurrencyInput 
        key={field.fieldKey}
        label={field.label}
        value={value}
        required={field.isRequired}
        validation={field.validationRules}
      />;
    case 'number':
      return <NumberInput 
        key={field.fieldKey}
        label={field.label}
        value={value}
        required={field.isRequired}
      />;
    // ... other field types
  }
}
```

### Step 3.3: Implement Admin Configuration Interface

```typescript
// New admin interface for managing configurations
export function ActivityManagementPage() {
  const [activities, setActivities] = useState<DynamicActivity[]>([]);
  
  const addActivity = async (activity: NewActivity) => {
    await db.insert(dynamicActivities).values(activity);
    // Refresh activities list
  };
  
  const updateActivity = async (id: number, changes: Partial<DynamicActivity>) => {
    await db.update(dynamicActivities)
      .set(changes)
      .where(eq(dynamicActivities.id, id));
  };
  
  return (
    <div>
      <h2>Activity Management</h2>
      <ActivityForm onSubmit={addActivity} />
      <ActivityList 
        activities={activities}
        onUpdate={updateActivity}
      />
    </div>
  );
}
```

### Step 3.4: Update Data Entry Logic

```typescript
// Replace hard-coded data entry with schema-driven approach
export async function saveFormData(
  schemaId: number,
  projectId: number,
  facilityId: number,
  formData: Record<string, any>
) {
  // Validate against schema
  const schema = await getFormSchema(schemaId);
  const validationResults = validateFormData(formData, schema);
  
  // Compute calculated fields
  const computedValues = computeCalculatedFields(formData, schema);
  
  // Save to schema_form_data_entries
  await db.insert(schemaFormDataEntries).values({
    schemaId,
    projectId,
    facilityId,
    entityType: 'planning',
    formData,
    computedValues,
    validationState: validationResults,
    createdBy: getCurrentUserId()
  });
}
```

## Migration Benefits Achieved

### ✅ Flexibility
- Activities and categories updated without code changes
- New programs added via admin interface
- Form fields modified without redeployment

### ✅ Reduced Maintenance
- Single schema instead of multiple TypeScript files
- Centralized validation rules
- Unified event mapping system

### ✅ Scalability
- Supports unlimited programs and facility types
- Dynamic form rendering handles new field types
- Configurable statement templates

### ✅ Empowerment
- Non-technical users manage configurations
- Real-time form updates
- Audit trail for all changes

## Post-Migration Cleanup

1. **Remove old tables** (after ensuring data migration is complete):
   - `categories`
   - `activities` 
   - `sub_categories`
   - `users` (replaced by `enhanced_users`)
   - `projects` (replaced by `enhanced_projects`)

2. **Remove TypeScript files**:
   - All hard-coded activity definition files
   - Hard-coded form configuration files
   - Manual mapping configuration files

3. **Update API endpoints** to use new schema-driven tables

4. **Test thoroughly** with different project types and facility types

## Rollback Strategy

Keep old tables during migration with `_legacy` suffix until migration is proven successful:
- `categories_legacy`
- `activities_legacy`
- `users_legacy`

This allows rollback if issues are discovered during testing.
