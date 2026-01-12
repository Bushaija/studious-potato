-- ===================================
-- TRANSFORMATION EXAMPLE
-- From Hard-coded TypeScript to Schema-driven Database
-- ===================================

-- 1. CREATE FORM SCHEMA FOR HIV HEALTH CENTER PLANNING
INSERT INTO form_schemas (name, version, project_type, facility_type, module_type, is_active, schema, created_by) 
VALUES (
  'HIV Health Center Planning Form',
  '1.0',
  'HIV',
  'health_center',
  'planning',
  true,
  '{
    "title": "HIV Planning - Health Center",
    "description": "Annual planning form for HIV activities at health center level",
    "defaultFields": [
      {
        "key": "frequency",
        "label": "Frequency",
        "type": "number",
        "required": true,
        "validation": {
          "min": 1,
          "max": 12
        },
        "helpText": "How many times per year"
      },
      {
        "key": "unit_cost",
        "label": "Unit Cost (RWF)",
        "type": "currency",
        "required": true,
        "validation": {
          "min": 0
        }
      },
      {
        "key": "count_q1",
        "label": "Count Q1",
        "type": "number",
        "defaultValue": 0
      },
      {
        "key": "count_q2", 
        "label": "Count Q2",
        "type": "number",
        "defaultValue": 0
      },
      {
        "key": "count_q3",
        "label": "Count Q3", 
        "type": "number",
        "defaultValue": 0
      },
      {
        "key": "count_q4",
        "label": "Count Q4",
        "type": "number", 
        "defaultValue": 0
      },
      {
        "key": "amount_q1",
        "label": "Amount Q1",
        "type": "calculated",
        "formula": "frequency * unit_cost * count_q1",
        "readOnly": true
      },
      {
        "key": "amount_q2", 
        "label": "Amount Q2",
        "type": "calculated",
        "formula": "frequency * unit_cost * count_q2",
        "readOnly": true
      },
      {
        "key": "amount_q3",
        "label": "Amount Q3",
        "type": "calculated", 
        "formula": "frequency * unit_cost * count_q3",
        "readOnly": true
      },
      {
        "key": "amount_q4",
        "label": "Amount Q4",
        "type": "calculated",
        "formula": "frequency * unit_cost * count_q4", 
        "readOnly": true
      },
      {
        "key": "total_budget",
        "label": "Total Budget",
        "type": "calculated",
        "formula": "amount_q1 + amount_q2 + amount_q3 + amount_q4",
        "readOnly": true
      },
      {
        "key": "comment",
        "label": "Comment",
        "type": "textarea",
        "required": false
      }
    ]
  }',
  1 -- created_by user_id
);

-- 2. CREATE ACTIVITY CATEGORIES (replacing hard-coded categories)
INSERT INTO activity_categories (project_type, facility_type, code, name, display_order, is_active) 
VALUES 
  ('HIV', 'health_center', 'HR', 'Human Resources (HR)', 1, true),
  ('HIV', 'health_center', 'TRC', 'Travel Related Costs (TRC)', 2, true),
  ('HIV', 'health_center', 'HPE', 'Health Products & Equipment (HPE)', 3, true),
  ('HIV', 'health_center', 'PAC', 'Program Administration Costs (PAC)', 4, true);

-- 3. CREATE DYNAMIC ACTIVITIES (replacing TypeScript HEALTH_CENTER_ACTIVITIES)
-- Get category IDs for reference
WITH category_ids AS (
  SELECT 
    id,
    code
  FROM activity_categories 
  WHERE project_type = 'HIV' 
    AND facility_type = 'health_center'
)

-- Insert HR activities
INSERT INTO dynamic_activities (
  category_id, 
  project_type, 
  facility_type, 
  name, 
  activity_type, 
  display_order, 
  is_annual_only,
  field_mappings,
  computation_rules,
  is_active
)
SELECT 
  c.id,
  'HIV',
  'health_center',
  'Provide salaries for health facilities staff (DHs, HCs)',
  'HC Nurses (A1) Salary',
  1,
  false,
  '{
    "applies_to": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4"],
    "field_overrides": {
      "frequency": {"defaultValue": 12, "label": "Months per year"},
      "unit_cost": {"label": "Monthly Salary (RWF)"}
    }
  }',
  '{
    "amount_q1": "frequency * unit_cost * count_q1",
    "amount_q2": "frequency * unit_cost * count_q2", 
    "amount_q3": "frequency * unit_cost * count_q3",
    "amount_q4": "frequency * unit_cost * count_q4",
    "total_budget": "amount_q1 + amount_q2 + amount_q3 + amount_q4"
  }',
  true
FROM category_ids c WHERE c.code = 'HR'

UNION ALL

SELECT 
  c.id,
  'HIV',
  'health_center', 
  'Provide salaries for health facilities staff (DHs, HCs)',
  'HC Lab Technician (A1) Salary',
  2,
  false,
  '{
    "applies_to": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4"],
    "field_overrides": {
      "frequency": {"defaultValue": 12, "label": "Months per year"},
      "unit_cost": {"label": "Monthly Salary (RWF)"}
    }
  }',
  '{
    "amount_q1": "frequency * unit_cost * count_q1",
    "amount_q2": "frequency * unit_cost * count_q2",
    "amount_q3": "frequency * unit_cost * count_q3", 
    "amount_q4": "frequency * unit_cost * count_q4",
    "total_budget": "amount_q1 + amount_q2 + amount_q3 + amount_q4"
  }',
  true
FROM category_ids c WHERE c.code = 'HR'

UNION ALL

SELECT 
  c.id,
  'HIV',
  'health_center',
  'Provide salaries for health facilities staff (DHs, HCs)',
  'Bonus (All staff paid on GF)',
  3,
  true, -- Annual only
  '{
    "applies_to": ["unit_cost", "count_q4"],
    "field_overrides": {
      "unit_cost": {"label": "Bonus Amount (RWF)"},
      "count_q1": {"isVisible": false},
      "count_q2": {"isVisible": false}, 
      "count_q3": {"isVisible": false},
      "count_q4": {"label": "Number of Staff"}
    }
  }',
  '{
    "amount_q1": "0",
    "amount_q2": "0",
    "amount_q3": "0", 
    "amount_q4": "unit_cost * count_q4",
    "total_budget": "amount_q4"
  }',
  true
FROM category_ids c WHERE c.code = 'HR'

UNION ALL

-- TRC Activities
SELECT 
  c.id,
  'HIV',
  'health_center',
  'Conduct support group meeting at Health Facilities especially for adolescents and children',
  'Workshop',
  1,
  false,
  '{
    "applies_to": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4"],
    "field_overrides": {
      "frequency": {"defaultValue": 4, "label": "Meetings per quarter"},
      "unit_cost": {"label": "Cost per meeting (RWF)"},
      "count_q1": {"label": "Q1 Meetings"},
      "count_q2": {"label": "Q2 Meetings"},
      "count_q3": {"label": "Q3 Meetings"},
      "count_q4": {"label": "Q4 Meetings"}
    }
  }',
  '{
    "amount_q1": "frequency * unit_cost * count_q1",
    "amount_q2": "frequency * unit_cost * count_q2",
    "amount_q3": "frequency * unit_cost * count_q3",
    "amount_q4": "frequency * unit_cost * count_q4", 
    "total_budget": "amount_q1 + amount_q2 + amount_q3 + amount_q4"
  }',
  true
FROM category_ids c WHERE c.code = 'TRC'

UNION ALL

SELECT 
  c.id,
  'HIV',
  'health_center',
  'Conduct supervision from Health centers to CHWs',
  'Supervision (CHWs)',
  2,
  false,
  '{
    "applies_to": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4"],
    "field_overrides": {
      "frequency": {"defaultValue": 1, "label": "Times per month"},
      "unit_cost": {"label": "Cost per supervision (RWF)"},
      "count_q1": {"label": "Q1 Supervisions"},
      "count_q2": {"label": "Q2 Supervisions"},
      "count_q3": {"label": "Q3 Supervisions"}, 
      "count_q4": {"label": "Q4 Supervisions"}
    }
  }',
  '{
    "amount_q1": "frequency * unit_cost * count_q1", 
    "amount_q2": "frequency * unit_cost * count_q2",
    "amount_q3": "frequency * unit_cost * count_q3",
    "amount_q4": "frequency * unit_cost * count_q4",
    "total_budget": "amount_q1 + amount_q2 + amount_q3 + amount_q4"
  }',
  true
FROM category_ids c WHERE c.code = 'TRC';

-- 4. CREATE VALIDATION RULES (centralized, reusable)
INSERT INTO validation_rules (name, rule_type, rule_config, error_message, is_global) 
VALUES 
  (
    'Positive Currency',
    'min', 
    '{"value": 0}',
    'Amount must be greater than or equal to 0',
    true
  ),
  (
    'Required Field',
    'required',
    '{}', 
    'This field is required',
    true
  ),
  (
    'Valid Frequency Range',
    'custom',
    '{"min": 1, "max": 12}',
    'Frequency must be between 1 and 12',
    true
  ),
  (
    'Count Range', 
    'custom',
    '{"min": 0, "max": 1000}',
    'Count must be between 0 and 1000',
    true
  );

-- 5. EXAMPLE: How to query the schema-driven data
-- Get form schema for HIV Health Center Planning
SELECT 
  fs.name,
  fs.version,
  fs.project_type,
  fs.facility_type,
  fs.module_type,
  fs.schema,
  json_array_length(fs.schema->'defaultFields') as field_count
FROM form_schemas fs 
WHERE fs.project_type = 'HIV'
  AND fs.facility_type = 'health_center'
  AND fs.module_type = 'planning'
  AND fs.is_active = true;

-- Get all activities for a category
SELECT 
  da.id,
  da.name,
  da.activity_type,
  da.display_order,
  da.is_annual_only,
  da.field_mappings,
  da.computation_rules,
  ac.name as category_name
FROM dynamic_activities da
JOIN activity_categories ac ON ac.id = da.category_id
WHERE da.project_type = 'HIV'
  AND da.facility_type = 'health_center'
  AND da.is_active = true
ORDER BY ac.display_order, da.display_order;

-- 6. EXAMPLE: Insert form data using the new structure
INSERT INTO form_data_entries (
  schema_id,
  entity_type,
  project_id,
  facility_id, 
  reporting_period_id,
  form_data,
  computed_values,
  created_by
) VALUES (
  1, -- schema_id from form_schemas
  'planning',
  1, -- project_id
  1, -- facility_id 
  1, -- reporting_period_id
  '{
    "activity_id": 1,
    "frequency": 12,
    "unit_cost": 150000,
    "count_q1": 2,
    "count_q2": 2,
    "count_q3": 2, 
    "count_q4": 2,
    "comment": "HC Nurses salary for HIV program"
  }',
  '{
    "amount_q1": 3600000,
    "amount_q2": 3600000,
    "amount_q3": 3600000,
    "amount_q4": 3600000,
    "total_budget": 14400000
  }',
  1 -- created_by user_id
);

-- 7. MIGRATION QUERY: Move existing planning_data to new structure
INSERT INTO form_data_entries (
  schema_id,
  entity_id,
  entity_type,
  project_id,
  facility_id,
  reporting_period_id,
  form_data,
  computed_values,
  created_by,
  created_at
)
SELECT 
  (SELECT id FROM form_schemas WHERE project_type = 'HIV' AND facility_type = 'health_center' AND module_type = 'planning' LIMIT 1) as schema_id,
  pd.id as entity_id,
  'planning' as entity_type,
  pd.project_id,
  pd.facility_id, 
  pd.reporting_period_id,
  jsonb_build_object(
    'activity_id', pd.activity_id,
    'frequency', pd.frequency,
    'unit_cost', pd.unit_cost,
    'count_q1', pd.count_q1,
    'count_q2', pd.count_q2,
    'count_q3', pd.count_q3,
    'count_q4', pd.count_q4,
    'comment', pd.comment
  ) as form_data,
  jsonb_build_object(
    'amount_q1', pd.amount_q1,
    'amount_q2', pd.amount_q2,
    'amount_q3', pd.amount_q3,
    'amount_q4', pd.amount_q4,
    'total_budget', pd.total_budget
  ) as computed_values,
  1 as created_by, -- Default system user
  pd.created_at
FROM planning_data pd
WHERE EXISTS (
  SELECT 1 FROM planning_activities pa 
  JOIN planning_categories pc ON pa.category_id = pc.id
  WHERE pa.id = pd.activity_id 
    AND pc.project_id IN (SELECT id FROM projects WHERE project_type = 'HIV')
);

-- ===================================
-- BENEFITS OF THIS TRANSFORMATION:
-- ===================================
-- 1. No more hard-coded TypeScript files
-- 2. Activities can be added/modified via admin UI
-- 3. Validation rules are centralized and reusable  
-- 4. Form rendering is completely dynamic
-- 5. Field mappings allow customization per activity
-- 6. Computation rules are stored and versioned
-- 7. Easy to extend to new programs (Malaria, TB)
-- 8. Supports A/B testing of form variations
-- 9. Complete audit trail of changes
-- 10. API-first approach enables multiple clients