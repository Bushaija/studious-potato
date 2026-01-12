# Migration Strategy: From Hard-Coded to Schema-Driven System

## Overview
This document outlines the strategy for migrating from the current hard-coded form system to a flexible, schema-driven approach that addresses the challenges identified in your documentation.

## Migration Phases

### Phase 1: Database Schema Extension (Weeks 1-2)

#### 1.1 Add New Tables
- Deploy the enhanced schema tables alongside existing ones
- Ensure no disruption to current operations
- Add new enum types and table structures

#### 1.2 Data Seeding Strategy
```sql
-- Example: Migrate existing categories to new schema-driven structure
INSERT INTO activity_categories (
  project_type, facility_type, code, name, display_order, is_active
) 
SELECT DISTINCT 
  'HIV' as project_type,
  'health_center' as facility_type,
  'HR' as code,
  'Human Resources (HR)' as name,
  1 as display_order,
  true as is_active;
```

#### 1.3 Create Default Form Schemas
Transform hard-coded TypeScript definitions into database records:

```json
{
  "name": "HIV Planning Form - Health Center",
  "version": "1.0",
  "projectType": "HIV",
  "facilityType": "health_center",
  "moduleType": "planning",
  "schema": {
    "categories": [
      {
        "code": "HR",
        "name": "Human Resources (HR)",
        "fields": [
          {
            "key": "frequency",
            "label": "Frequency",
            "type": "number",
            "required": true,
            "validation": {"min": 1, "max": 12}
          },
          {
            "key": "unit_cost",
            "label": "Unit Cost",
            "type": "currency",
            "required": true,
            "validation": {"min": 0}
          }
        ]
      }
    ]
  }
}
```

### Phase 2: Backend API Development (Weeks 3-5)

#### 2.1 Schema Management APIs
```typescript
// GET /api/schemas?projectType=HIV&facilityType=health_center&module=planning
// POST /api/schemas (Admin only)
// PUT /api/schemas/:id (Admin only)
// DELETE /api/schemas/:id (Admin only)

interface FormSchemaResponse {
  id: number;
  name: string;
  version: string;
  projectType: 'HIV' | 'Malaria' | 'TB';
  facilityType: 'hospital' | 'health_center';
  moduleType: 'planning' | 'execution' | 'reporting';
  schema: FormSchemaDefinition;
  isActive: boolean;
}
```

#### 2.2 Dynamic Form Data APIs
```typescript
// GET /api/form-data?schemaId=1&projectId=1&facilityId=1
// POST /api/form-data (Submit form data)
// PUT /api/form-data/:id (Update form data)

interface FormDataResponse {
  id: number;
  schemaId: number;
  projectId: number;
  facilityId: number;
  formData: Record<string, any>;
  computedValues: Record<string, number>;
  validationState: {
    isValid: boolean;
    errors: ValidationError[];
  };
}
```

#### 2.3 Validation Engine
```typescript
class ValidationEngine {
  async validateFormData(
    schemaId: number, 
    formData: Record<string, any>
  ): Promise<ValidationResult> {
    const schema = await this.getFormSchema(schemaId);
    const rules = await this.getValidationRules(schema);
    
    const errors: ValidationError[] = [];
    
    for (const field of schema.fields) {
      const value = formData[field.key];
      const fieldErrors = await this.validateField(field, value, rules);
      errors.push(...fieldErrors);
    }
    
    return { isValid: errors.length === 0, errors };
  }
}
```

#### 2.4 Computation Engine
```typescript
class ComputationEngine {
  computeValues(
    formData: Record<string, any>,
    computationRules: ComputationRule[]
  ): Record<string, number> {
    const computed: Record<string, number> = {};
    
    for (const rule of computationRules) {
      if (rule.type === 'formula') {
        computed[rule.targetField] = this.evaluateFormula(
          rule.formula, 
          formData, 
          computed
        );
      } else if (rule.type === 'aggregation') {
        computed[rule.targetField] = this.aggregateValues(
          rule.sourceFields, 
          formData, 
          rule.operation
        );
      }
    }
    
    return computed;
  }
}
```

### Phase 3: Frontend Form Engine (Weeks 6-8)

#### 3.1 Dynamic Form Renderer
```typescript
interface DynamicFormProps {
  schemaId: number;
  projectId: number;
  facilityId: number;
  onSubmit: (data: Record<string, any>) => Promise<void>;
}

const DynamicForm: React.FC<DynamicFormProps> = ({ 
  schemaId, 
  projectId, 
  facilityId, 
  onSubmit 
}) => {
  const { data: schema, isLoading } = useFormSchema(schemaId);
  const { data: formData } = useFormData(schemaId, projectId, facilityId);
  
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  if (isLoading) return <FormSkeleton />;
  
  return (
    <Form onSubmit={handleSubmit}>
      {schema.categories.map(category => (
        <FormSection key={category.code} title={category.name}>
          {category.fields.map(field => (
            <DynamicField
              key={field.key}
              field={field}
              value={values[field.key]}
              error={errors[field.key]}
              onChange={(value) => handleFieldChange(field.key, value)}
            />
          ))}
        </FormSection>
      ))}
    </Form>
  );
};
```

#### 3.2 Field Type Components
```typescript
const DynamicField: React.FC<DynamicFieldProps> = ({ field, value, error, onChange }) => {
  switch (field.type) {
    case 'currency':
      return (
        <CurrencyInput
          label={field.label}
          value={value}
          onChange={onChange}
          error={error}
          required={field.required}
          min={field.validation?.min}
          max={field.validation?.max}
        />
      );
    
    case 'calculated':
      return (
        <CalculatedField
          label={field.label}
          formula={field.computationFormula}
          dependencies={field.dependencies}
          value={value}
          readOnly
        />
      );
    
    case 'select':
      return (
        <Select
          label={field.label}
          options={field.options}
          value={value}
          onChange={onChange}
          error={error}
          required={field.required}
        />
      );
    
    default:
      return (
        <TextInput
          label={field.label}
          value={value}
          onChange={onChange}
          error={error}
          required={field.required}
        />
      );
  }
};
```

### Phase 4: Admin Configuration Interface (Weeks 9-11)

#### 4.1 Schema Builder Interface
```typescript
const SchemaBuilder: React.FC = () => {
  const [schema, setSchema] = useState<FormSchemaDefinition>();
  const [previewMode, setPreviewMode] = useState(false);
  
  return (
    <div className="schema-builder">
      <div className="builder-panel">
        <SchemaMetadata schema={schema} onChange={setSchema} />
        <CategoryBuilder schema={schema} onChange={setSchema} />
        <FieldBuilder schema={schema} onChange={setSchema} />
        <ValidationRuleBuilder schema={schema} onChange={setSchema} />
      </div>
      
      <div className="preview-panel">
        {previewMode && <DynamicFormPreview schema={schema} />}
      </div>
      
      <div className="actions">
        <Button onClick={() => setPreviewMode(!previewMode)}>
          {previewMode ? 'Edit' : 'Preview'}
        </Button>
        <Button variant="primary" onClick={saveSchema}>
          Save Schema
        </Button>
      </div>
    </div>
  );
};
```

#### 4.2 Event Mapping Configuration
```typescript
const EventMappingManager: React.FC = () => {
  const { data: events } = useEvents();
  const { data: activities } = useActivities();
  const { data: mappings } = useEventMappings();
  
  return (
    <div className="mapping-manager">
      <MappingTable
        events={events}
        activities={activities}
        mappings={mappings}
        onMappingChange={updateMapping}
        onMappingDelete={deleteMapping}
      />
      
      <CreateMappingDialog
        events={events}
        activities={activities}
        onMappingCreate={createMapping}
      />
    </div>
  );
};
```

### Phase 5: Data Migration & Testing (Weeks 12-14)

#### 5.1 Data Migration Scripts
```sql
-- Migrate existing planning data to new form data entries
WITH planning_schema AS (
  SELECT id FROM form_schemas 
  WHERE project_type = 'HIV' 
  AND facility_type = 'health_center' 
  AND module_type = 'planning'
  LIMIT 1
)
INSERT INTO form_data_entries (
  schema_id, 
  entity_id, 
  entity_type, 
  project_id, 
  facility_id, 
  reporting_period_id,
  form_data,
  computed_values
)
SELECT 
  (SELECT id FROM planning_schema),
  pd.id,
  'planning',
  pd.project_id,
  pd.facility_id,
  pd.reporting_period_id,
  jsonb_build_object(
    'frequency', pd.frequency,
    'unit_cost', pd.unit_cost,
    'count_q1', pd.count_q1,
    'count_q2', pd.count_q2,
    'count_q3', pd.count_q3,
    'count_q4', pd.count_q4,
    'comment', pd.comment
  ),
  jsonb_build_object(
    'amount_q1', pd.amount_q1,
    'amount_q2', pd.amount_q2,
    'amount_q3', pd.amount_q3,
    'amount_q4', pd.amount_q4,
    'total_budget', pd.total_budget
  )
FROM planning_data pd;
```

#### 5.2 Parallel Operation Strategy
1. **Dual Write Phase**: Write to both old and new systems
2. **Validation Phase**: Compare outputs between systems
3. **Gradual Migration**: Move users to new system facility by facility
4. **Old System Retirement**: Remove old tables after verification

### Phase 6: Deployment & Training (Weeks 15-16)

#### 6.1 Feature Flags
```typescript
const useFeatureFlag = (flag: string) => {
  const { data: config } = useSystemConfig();
  return config?.featureFlags?.[flag] ?? false;
};

const PlanningForm = () => {
  const useNewFormEngine = useFeatureFlag('new_form_engine');
  
  return useNewFormEngine ? 
    <DynamicForm schemaId={1} /> : 
    <LegacyPlanningForm />;
};
```

#### 6.2 Training Materials
- Admin guide for schema management
- User guide for new form interface
- Video tutorials for configuration changes
- Troubleshooting documentation

## Risk Mitigation

### Technical Risks
- **Data Loss**: Implement comprehensive backup strategy
- **Performance**: Load test with realistic data volumes
- **Validation Bugs**: Extensive testing of validation rules
- **Migration Failures**: Rollback procedures for each phase

### Business Risks
- **User Resistance**: Involve key users in design process
- **Training Gap**: Provide hands-on training sessions
- **Reporting Disruption**: Maintain parallel reporting during transition
- **Deadline Pressure**: Build buffer time into each phase

## Success Metrics

### Technical Metrics
- Form rendering performance: < 2 seconds
- Data validation accuracy: 99.9%
- API response times: < 500ms
- Zero data loss during migration

### Business Metrics
- Reduced form update time: From days to minutes
- Increased user satisfaction: Target 90%+
- Reduced support tickets: 50% reduction
- Faster compliance adaptation: Same day vs weeks

## Post-Migration Benefits

1. **Operational Efficiency**
   - No developer intervention for form changes
   - Real-time validation and computation
   - Automated compliance checking

2. **Scalability**
   - Support for new programs without code changes
   - Easy integration with external systems
   - Flexible reporting requirements

3. **Maintainability**
   - Centralized validation rules
   - Version-controlled schema changes
   - Audit trail for all modifications

4. **User Experience**
   - Consistent interface across modules
   - Context-sensitive help and validation
   - Mobile-responsive design