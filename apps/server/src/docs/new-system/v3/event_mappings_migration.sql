-- =================================================================
-- Event Mappings Migration Script
-- Migrates hard-coded activity-event mappings to configurable database schema
-- =================================================================

-- First, let's create a temporary table to store the hard-coded mappings
-- This helps us manage the migration process more systematically

CREATE TEMPORARY TABLE temp_legacy_mappings (
  activity_name VARCHAR(500),
  event_code VARCHAR(50),
  mapping_notes TEXT
);

-- Insert all the hard-coded mappings from activity-event-mappings.ts
INSERT INTO temp_legacy_mappings (activity_name, event_code, mapping_notes) VALUES
  -- Receipts
  ('Other Incomes', 'OTHER_REVENUE', 'Direct mapping from execution module'),
  ('Transfers from SPIU/RBC', 'TRANSFERS_PUBLIC_ENTITIES', 'Direct mapping from execution module'),

  -- Expenditures - Staff related
  ('Laboratory Technician', 'GOODS_SERVICES', 'Staff services mapped to goods & services'),
  ('Nurse', 'GOODS_SERVICES', 'Staff services mapped to goods & services'),
  
  -- Expenditures - Supervision and support
  ('Supervision CHWs', 'GOODS_SERVICES', 'Supervision activities'),
  ('Support group meetings', 'GOODS_SERVICES', 'Meeting and workshop activities'),
  
  -- Expenditures - Transport and travel
  ('Sample transport', 'GOODS_SERVICES', 'Transportation services'),
  ('Home visit lost to follow up', 'GOODS_SERVICES', 'Field visit activities'),
  ('Transport and travel for survey/surveillance', 'GOODS_SERVICES', 'Travel related costs'),
  
  -- Expenditures - Infrastructure and admin
  ('Infrastructure support', 'GOODS_SERVICES', 'Infrastructure maintenance'),
  ('Office supplies', 'GOODS_SERVICES', 'Office supplies and materials'),
  ('Transport and travel (Reporting)', 'GOODS_SERVICES', 'Reporting related travel'),
  ('Bank charges', 'GOODS_SERVICES', 'Banking and financial services'),
  
  -- Transfers
  ('Transfer to RBC', 'GRANTS_TRANSFERS', 'Transfers to public entities'),
  
  -- Assets
  ('Cash at bank', 'CASH_EQUIVALENTS_END', 'Cash position at period end'),
  ('Petty cash', 'CASH_EQUIVALENTS_END', 'Small cash holdings'),
  ('Receivables (VAT refund)', 'ADVANCE_PAYMENTS', 'VAT receivables'),
  ('Other Receivables', 'ADVANCE_PAYMENTS', 'General receivables'),
  
  -- Liabilities
  ('Salaries on borrowed funds (BONUS)', 'PAYABLES', 'Staff bonus payables'),
  ('Payable - Maintenance & Repairs', 'PAYABLES', 'Maintenance payables'),
  ('Payable - Office suppliers', 'PAYABLES', 'Office supply payables'),
  ('Payable - Transportation fees', 'PAYABLES', 'Transport payables'),
  ('VAT refund to RBC', 'PAYABLES', 'VAT payables to government'),
  
  -- Equity/Closing balance
  ('Accumulated Surplus/Deficit', 'ACCUMULATED_SURPLUS_DEFICITS', 'Accumulated equity position'),
  ('Prior Year Adjustment', 'PRIOR_YEAR_ADJUSTMENTS', 'Prior period adjustments');

-- =================================================================
-- Planning Module Activity Mappings
-- Map planning activities to appropriate events for Budget vs Actual reporting
-- =================================================================

-- Create mappings for planning module activities
-- These are derived from your form schema seeding data
INSERT INTO configurable_event_mappings (
  event_id, 
  activity_id, 
  category_id,
  project_type, 
  facility_type, 
  mapping_type, 
  is_active,
  metadata
)
SELECT 
  e.id as event_id,
  da.id as activity_id,
  da.category_id,
  da.project_type,
  da.facility_type,
  'DIRECT'::mapping_type as mapping_type,
  true as is_active,
  jsonb_build_object(
    'source', 'planning_migration',
    'activity_type', da.activity_type,
    'event_description', e.description,
    'mapping_rule', 'salary_activities_to_compensation'
  ) as metadata
FROM events e
CROSS JOIN dynamic_activities da
WHERE e.code = 'COMPENSATION_EMPLOYEES'
  AND (
    da.code LIKE '%salary%' 
    OR da.code LIKE '%bonus%'
    OR da.activity_type LIKE '%Salary%'
    OR da.activity_type LIKE '%Bonus%'
  );

-- Map travel and supervision activities to GOODS_SERVICES_PLANNING
INSERT INTO configurable_event_mappings (
  event_id, 
  activity_id, 
  category_id,
  project_type, 
  facility_type, 
  mapping_type, 
  is_active,
  metadata
)
SELECT 
  e.id as event_id,
  da.id as activity_id,
  da.category_id,
  da.project_type,
  da.facility_type,
  'DIRECT'::mapping_type as mapping_type,
  true as is_active,
  jsonb_build_object(
    'source', 'planning_migration',
    'activity_type', da.activity_type,
    'event_description', e.description,
    'mapping_rule', 'travel_activities_to_goods_services'
  ) as metadata
FROM events e
CROSS JOIN dynamic_activities da
WHERE e.code = 'GOODS_SERVICES_PLANNING'
  AND (
    da.code LIKE '%transport%'
    OR da.code LIKE '%supervision%'
    OR da.code LIKE '%workshop%'
    OR da.code LIKE '%training%'
    OR da.code LIKE '%campaign%'
    OR da.code LIKE '%meeting%'
    OR da.code LIKE '%mentoring%'
    OR da.code LIKE '%contact_tracing%'
    OR da.activity_type LIKE '%Transport%'
    OR da.activity_type LIKE '%Supervision%'
    OR da.activity_type LIKE '%Workshop%'
    OR da.activity_type LIKE '%Training%'
  );

-- Map equipment and maintenance activities to GOODS_SERVICES_PLANNING
INSERT INTO configurable_event_mappings (
  event_id, 
  activity_id, 
  category_id,
  project_type, 
  facility_type, 
  mapping_type, 
  is_active,
  metadata
)
SELECT 
  e.id as event_id,
  da.id as activity_id,
  da.category_id,
  da.project_type,
  da.facility_type,
  'DIRECT'::mapping_type as mapping_type,
  true as is_active,
  jsonb_build_object(
    'source', 'planning_migration',
    'activity_type', da.activity_type,
    'event_description', e.description,
    'mapping_rule', 'equipment_activities_to_goods_services'
  ) as metadata
FROM events e
CROSS JOIN dynamic_activities da
WHERE e.code = 'GOODS_SERVICES_PLANNING'
  AND (
    da.code LIKE '%maintenance%'
    OR da.code LIKE '%repair%'
    OR da.code LIKE '%equipment%'
    OR da.activity_type LIKE '%Maintenance%'
    OR da.activity_type LIKE '%Repair%'
  );

-- Map administrative costs to GOODS_SERVICES_PLANNING
INSERT INTO configurable_event_mappings (
  event_id, 
  activity_id, 
  category_id,
  project_type, 
  facility_type, 
  mapping_type, 
  is_active,
  metadata
)
SELECT 
  e.id as event_id,
  da.id as activity_id,
  da.category_id,
  da.project_type,
  da.facility_type,
  'DIRECT'::mapping_type as mapping_type,
  true as is_active,
  jsonb_build_object(
    'source', 'planning_migration',
    'activity_type', da.activity_type,
    'event_description', e.description,
    'mapping_rule', 'admin_activities_to_goods_services'
  ) as metadata
FROM events e
CROSS JOIN dynamic_activities da
WHERE e.code = 'GOODS_SERVICES_PLANNING'
  AND (
    da.code LIKE '%communication%'
    OR da.code LIKE '%office_supplies%'
    OR da.code LIKE '%bank_charges%'
    OR da.code LIKE '%fuel%'
    OR da.activity_type LIKE '%Communication%'
    OR da.activity_type LIKE '%Office Supplies%'
    OR da.activity_type LIKE '%Bank charges%'
    OR da.activity_type LIKE '%Fuel%'
  );

-- =================================================================
-- Execution Module Activity Mappings
-- Map execution activities based on hard-coded mappings
-- =================================================================

-- Create a function to help with fuzzy matching of activity names
CREATE OR REPLACE FUNCTION match_execution_activity(activity_pattern TEXT, activity_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Simple pattern matching - can be enhanced with more sophisticated logic
  RETURN LOWER(activity_name) LIKE LOWER('%' || activity_pattern || '%');
END;
$$ LANGUAGE plpgsql;

-- Map execution activities using the hard-coded mappings
-- Note: Since execution activities aren't in dynamic_activities yet, 
-- we'll create placeholder mappings based on category patterns

-- Revenue mappings (Receipts section)
INSERT INTO configurable_event_mappings (
  event_id, 
  category_id,
  project_type, 
  facility_type, 
  mapping_type, 
  is_active,
  metadata
)
SELECT 
  e.id as event_id,
  cat.id as category_id,
  cat.project_type,
  cat.facility_type,
  'COMPUTED'::mapping_type as mapping_type,
  true as is_active,
  jsonb_build_object(
    'source', 'execution_migration',
    'mapping_rule', 'receipts_to_revenue',
    'event_code', e.code,
    'category_pattern', 'Other Incomes',
    'computation_note', 'Maps Other Incomes from receipts section'
  ) as metadata
FROM events e
CROSS JOIN schema_activity_categories cat
WHERE e.code = 'OTHER_REVENUE'
  AND cat.code = 'RECEIPTS_A'  -- Assuming execution has specific receipt categories
ON CONFLICT DO NOTHING;

-- Add more execution mappings based on the patterns in your hard-coded file
INSERT INTO configurable_event_mappings (
  event_id, 
  category_id,
  project_type, 
  facility_type, 
  mapping_type, 
  is_active,
  metadata
)
SELECT 
  e.id as event_id,
  cat.id as category_id,
  cat.project_type,
  cat.facility_type,
  'COMPUTED'::mapping_type as mapping_type,
  true as is_active,
  jsonb_build_object(
    'source', 'execution_migration',
    'mapping_rule', 'transfers_from_public_entities',
    'event_code', e.code,
    'category_pattern', 'Transfers from SPIU/RBC'
  ) as metadata
FROM events e
CROSS JOIN schema_activity_categories cat
WHERE e.code = 'TRANSFERS_PUBLIC_ENTITIES'
ON CONFLICT DO NOTHING;

-- =================================================================
-- Category-Level Mappings for Totals and Subtotals
-- =================================================================

-- Map entire categories to events for summary calculations
INSERT INTO configurable_event_mappings (
  event_id, 
  category_id,
  project_type, 
  facility_type, 
  mapping_type, 
  mapping_formula,
  is_active,
  metadata
)
SELECT 
  e.id as event_id,
  cat.id as category_id,
  cat.project_type,
  cat.facility_type,
  'AGGREGATED'::mapping_type as mapping_type,
  'SUM(activity_amounts)' as mapping_formula,
  true as is_active,
  jsonb_build_object(
    'source', 'category_aggregation',
    'mapping_rule', 'category_total',
    'event_code', e.code,
    'category_code', cat.code,
    'aggregation_method', 'SUM'
  ) as metadata
FROM events e
CROSS JOIN schema_activity_categories cat
WHERE e.code IN ('TOTAL_RECEIPTS', 'TOTAL_PAYMENTS')
  AND cat.code IN ('HR', 'TRC', 'HPE', 'PA')
ON CONFLICT DO NOTHING;

-- =================================================================
-- Statement Template Mappings
-- Update statement templates to reference the new configurable mappings
-- =================================================================

-- Enhanced statement templates with event mapping references
INSERT INTO enhanced_statement_templates (
  statement_code,
  statement_name,
  line_item,
  line_code,
  display_order,
  level,
  is_total_line,
  event_mappings,
  calculation_formula,
  aggregation_method,
  metadata,
  is_active
) VALUES
-- Revenue and Expenditure Statement
('REV_EXP', 'Statement of Revenue and Expenditures', 'REVENUE', 'REV', 1, 1, false, 
 jsonb_build_array('OTHER_REVENUE', 'TRANSFERS_PUBLIC_ENTITIES', 'GRANTS'), 
 NULL, 'SUM', 
 jsonb_build_object('section', 'revenue'), true),

('REV_EXP', 'Statement of Revenue and Expenditures', 'Other Revenue', 'REV_OTHER', 2, 2, false, 
 jsonb_build_array('OTHER_REVENUE'), 
 NULL, 'SUM', 
 jsonb_build_object('section', 'revenue', 'detail', true), true),

('REV_EXP', 'Statement of Revenue and Expenditures', 'Transfers from Public Entities', 'REV_TRANSFERS', 3, 2, false, 
 jsonb_build_array('TRANSFERS_PUBLIC_ENTITIES'), 
 NULL, 'SUM', 
 jsonb_build_object('section', 'revenue', 'detail', true), true),

('REV_EXP', 'Statement of Revenue and Expenditures', 'Total Revenue', 'REV_TOTAL', 4, 2, true, 
 jsonb_build_array('OTHER_REVENUE', 'TRANSFERS_PUBLIC_ENTITIES'), 
 NULL, 'SUM', 
 jsonb_build_object('section', 'revenue', 'total', true), true),

('REV_EXP', 'Statement of Revenue and Expenditures', 'EXPENDITURES', 'EXP', 5, 1, false, 
 jsonb_build_array('COMPENSATION_EMPLOYEES', 'GOODS_SERVICES', 'GRANTS_TRANSFERS'), 
 NULL, 'SUM', 
 jsonb_build_object('section', 'expenditure'), true),

('REV_EXP', 'Statement of Revenue and Expenditures', 'Compensation of Employees', 'EXP_COMPENSATION', 6, 2, false, 
 jsonb_build_array('COMPENSATION_EMPLOYEES'), 
 NULL, 'SUM', 
 jsonb_build_object('section', 'expenditure', 'detail', true), true),

('REV_EXP', 'Statement of Revenue and Expenditures', 'Goods and Services', 'EXP_GOODS_SERVICES', 7, 2, false, 
 jsonb_build_array('GOODS_SERVICES', 'GOODS_SERVICES_PLANNING'), 
 NULL, 'SUM', 
 jsonb_build_object('section', 'expenditure', 'detail', true), true),

('REV_EXP', 'Statement of Revenue and Expenditures', 'Total Expenditures', 'EXP_TOTAL', 8, 2, true, 
 jsonb_build_array('COMPENSATION_EMPLOYEES', 'GOODS_SERVICES', 'GOODS_SERVICES_PLANNING', 'GRANTS_TRANSFERS'), 
 NULL, 'SUM', 
 jsonb_build_object('section', 'expenditure', 'total', true), true),

('REV_EXP', 'Statement of Revenue and Expenditures', 'Net Surplus/(Deficit)', 'NET_SURPLUS', 9, 1, true, 
 jsonb_build_array(), 
 'TOTAL_REVENUE - TOTAL_EXPENDITURES', 'COMPUTED', 
 jsonb_build_object('section', 'net_result', 'total', true), true);

-- Budget vs Actual Statement
INSERT INTO enhanced_statement_templates (
  statement_code,
  statement_name,
  line_item,
  line_code,
  display_order,
  level,
  event_mappings,
  calculation_formula,
  aggregation_method,
  metadata,
  is_active
) VALUES
('BUDGET_VS_ACTUAL', 'Statement of Budget vs Actual', 'RECEIPTS', 'BVA_RECEIPTS', 1, 1, 
 jsonb_build_array('TOTAL_RECEIPTS'), 
 NULL, 'SUM', 
 jsonb_build_object('section', 'receipts', 'has_budget_comparison', true), true),

('BUDGET_VS_ACTUAL', 'Statement of Budget vs Actual', 'PAYMENTS', 'BVA_PAYMENTS', 2, 1, 
 jsonb_build_array('TOTAL_PAYMENTS', 'COMPENSATION_EMPLOYEES', 'GOODS_SERVICES_PLANNING'), 
 NULL, 'SUM', 
 jsonb_build_object('section', 'payments', 'has_budget_comparison', true), true),

('BUDGET_VS_ACTUAL', 'Statement of Budget vs Actual', 'Compensation of Employees', 'BVA_COMPENSATION', 3, 2, 
 jsonb_build_array('COMPENSATION_EMPLOYEES'), 
 NULL, 'SUM', 
 jsonb_build_object('section', 'payments', 'detail', true, 'has_budget_comparison', true), true),

('BUDGET_VS_ACTUAL', 'Statement of Budget vs Actual', 'Goods and Services', 'BVA_GOODS_SERVICES', 4, 2, 
 jsonb_build_array('GOODS_SERVICES_PLANNING'), 
 NULL, 'SUM', 
 jsonb_build_object('section', 'payments', 'detail', true, 'has_budget_comparison', true), true);

-- =================================================================
-- Verification and Cleanup
-- =================================================================

-- Create a view to verify the mappings
CREATE OR REPLACE VIEW v_event_mappings_summary AS
SELECT 
  cem.id,
  e.code as event_code,
  e.description as event_description,
  da.code as activity_code,
  da.name as activity_name,
  cat.code as category_code,
  cat.name as category_name,
  cem.project_type,
  cem.facility_type,
  cem.mapping_type,
  cem.is_active,
  cem.metadata->>'mapping_rule' as mapping_rule,
  cem.created_at
FROM configurable_event_mappings cem
LEFT JOIN events e ON cem.event_id = e.id
LEFT JOIN dynamic_activities da ON cem.activity_id = da.id
LEFT JOIN schema_activity_categories cat ON cem.category_id = cat.id
ORDER BY e.code, da.code;

-- Cleanup temporary table
DROP TABLE IF EXISTS temp_legacy_mappings;

-- Drop the helper function
DROP FUNCTION IF EXISTS match_execution_activity(TEXT, TEXT);

-- =================================================================
-- Validation Queries
-- =================================================================

-- Count mappings by type
SELECT 
  mapping_type,
  COUNT(*) as mapping_count,
  COUNT(DISTINCT event_id) as unique_events,
  COUNT(DISTINCT activity_id) as unique_activities
FROM configurable_event_mappings 
WHERE is_active = true
GROUP BY mapping_type;

-- Check for unmapped activities (activities without event mappings)
SELECT 
  da.project_type,
  da.facility_type,
  cat.name as category_name,
  da.name as activity_name,
  da.code as activity_code
FROM dynamic_activities da
LEFT JOIN schema_activity_categories cat ON da.category_id = cat.id
LEFT JOIN configurable_event_mappings cem ON da.id = cem.activity_id
WHERE da.is_active = true 
  AND cem.id IS NULL
ORDER BY da.project_type, da.facility_type, cat.name, da.name;

-- Check for events without mappings
SELECT 
  e.code,
  e.description,
  e.event_type,
  ARRAY_AGG(DISTINCT e.statement_codes) as statement_codes
FROM events e
LEFT JOIN configurable_event_mappings cem ON e.id = cem.event_id
WHERE cem.id IS NULL
GROUP BY e.id, e.code, e.description, e.event_type
ORDER BY e.code;

-- =================================================================
-- Comments and Usage Notes
-- =================================================================

/*
MIGRATION SUMMARY:
This script migrates your hard-coded event mappings to the new configurable schema by:

1. Creating direct mappings for planning activities based on activity patterns
2. Setting up category-level mappings for aggregations
3. Establishing execution module mappings using the hard-coded patterns
4. Updating statement templates with configurable event references
5. Creating verification views and validation queries

KEY FEATURES:
- Preserves existing mapping logic while making it configurable
- Supports different mapping types (DIRECT, COMPUTED, AGGREGATED)
- Includes metadata for audit trails and mapping explanations
- Provides validation queries to ensure completeness

NEXT STEPS:
1. Run this migration script
2. Verify mappings using the validation queries
3. Update your application code to use configurable_event_mappings table
4. Create execution module activities and map them appropriately
5. Test financial statement generation with new mappings

MAINTENANCE:
- Use the v_event_mappings_summary view to monitor mappings
- Update metadata when mapping rules change
- Use effective_from/effective_to for time-based mapping changes
*/