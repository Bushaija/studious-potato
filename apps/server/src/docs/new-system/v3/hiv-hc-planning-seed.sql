
-- =====================================================================
-- HIV HEALTH CENTER PLANNING MODULE SEEDING QUERY
-- =====================================================================
-- This script creates the schema-driven configuration for HIV Health Center
-- planning forms, including form schemas, activity categories, dynamic activities,
-- and form fields based on the current hard-coded implementation.

BEGIN;

-- =====================================================================
-- 1. CREATE FORM SCHEMA
-- =====================================================================

INSERT INTO form_schemas (name, version, project_type, facility_type, module_type, is_active, schema, metadata, created_by)
VALUES (
  'HIV Health Center Planning Form',
  '1.0',
  'HIV',
  'health_center',
  'planning',
  true,
  '{
    "formId": "hiv_hc_planning",
    "title": "HIV Health Center Planning",
    "description": "Annual planning form for HIV programs at Health Centers with quarterly breakdown",
    "version": "1.0",
    "moduleType": "planning",
    "sections": [
      {
        "id": "hr_section",
        "title": "Human Resources (HR)",
        "description": "Staff salaries and compensation planning",
        "order": 1,
        "categoryCode": "HR",
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "amount_q1", "amount_q2", "amount_q3", "amount_q4", "total_amount", "comment"],
        "isCollapsible": true,
        "defaultExpanded": true
      },
      {
        "id": "trc_section",
        "title": "Travel Related Costs (TRC)",
        "description": "Travel and transportation related activities",
        "order": 2,
        "categoryCode": "TRC",
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "amount_q1", "amount_q2", "amount_q3", "amount_q4", "total_amount", "comment"],
        "isCollapsible": true,
        "defaultExpanded": true
      },
      {
        "id": "hpe_section",
        "title": "Health Products & Equipment (HPE)",
        "description": "Equipment, supplies, and infrastructure planning",
        "order": 3,
        "categoryCode": "HPE",
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "amount_q1", "amount_q2", "amount_q3", "amount_q4", "total_amount", "comment"],
        "isCollapsible": true,
        "defaultExpanded": true
      },
      {
        "id": "pac_section",
        "title": "Program Administration Costs (PAC)",
        "description": "Administrative and operational costs",
        "order": 4,
        "categoryCode": "PAC",
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "amount_q1", "amount_q2", "amount_q3", "amount_q4", "total_amount", "comment"],
        "isCollapsible": true,
        "defaultExpanded": true
      }
    ],
    "calculations": {
      "quarterlyAmounts": "unit_cost * count * frequency",
      "totalAmount": "amount_q1 + amount_q2 + amount_q3 + amount_q4"
    },
    "validation": {
      "required": ["frequency", "unit_cost"],
      "minimums": {
        "unit_cost": 0,
        "count_q1": 0,
        "count_q2": 0,
        "count_q3": 0,
        "count_q4": 0
      }
    }
  }'::jsonb,
  '{
    "createdFor": "HIV Health Center Planning Migration",
    "basedOn": "hardcoded_form_schema",
    "migrationDate": "2024-01-01",
    "quarterlyStructure": true,
    "supportedCalculations": ["auto_amount", "auto_total"],
    "compatibleWith": ["legacy_planning_data"]
  }'::jsonb,
  1
);


-- Get the form schema ID for foreign key references
-- Note: In actual migration, you might want to use a variable or known ID
SET @schema_id = LAST_INSERT_ID();

-- =====================================================================
-- 2. CREATE ACTIVITY CATEGORIES
-- =====================================================================

-- Human Resources Category
INSERT INTO schema_activity_categories (
  project_type, facility_type, code, name, description, display_order, 
  is_computed, metadata, is_active
) VALUES (
  'HIV', 'health_center', 'HR', 'Human Resources (HR)', 
  'Staff salaries, compensation, and human resource related costs', 1, 
  false, 
  '{"section": "hr_section", "icon": "users", "color": "#3B82F6"}'::jsonb, 
  true
);

SET @hr_category_id = LAST_INSERT_ID();

-- Travel Related Costs Category  
INSERT INTO schema_activity_categories (
  project_type, facility_type, code, name, description, display_order,
  is_computed, metadata, is_active
) VALUES (
  'HIV', 'health_center', 'TRC', 'Travel Related Costs (TRC)',
  'Transportation, supervision, workshops, and travel-related activities', 2,
  false,
  '{"section": "trc_section", "icon": "car", "color": "#10B981"}'::jsonb,
  true
);

SET @trc_category_id = LAST_INSERT_ID();

-- Health Products & Equipment Category
INSERT INTO schema_activity_categories (
  project_type, facility_type, code, name, description, display_order,
  is_computed, metadata, is_active
) VALUES (
  'HIV', 'health_center', 'HPE', 'Health Products & Equipment (HPE)',
  'Medical equipment, supplies, infrastructure, and maintenance', 3,
  false,
  '{"section": "hpe_section", "icon": "medical-kit", "color": "#F59E0B"}'::jsonb,
  true
);

SET @hpe_category_id = LAST_INSERT_ID();

-- Program Administration Costs Category
INSERT INTO schema_activity_categories (
  project_type, facility_type, code, name, description, display_order,
  is_computed, metadata, is_active
) VALUES (
  'HIV', 'health_center', 'PAC', 'Program Administration Costs (PAC)',
  'Administrative costs, office supplies, communications, and operational expenses', 4,
  false,
  '{"section": "pac_section", "icon": "briefcase", "color": "#8B5CF6"}'::jsonb,
  true
);

SET @pac_category_id = LAST_INSERT_ID();

-- =====================================================================
-- 3. CREATE DYNAMIC ACTIVITIES
-- =====================================================================

-- Human Resources Activities
INSERT INTO dynamic_activities (
  category_id, project_type, facility_type, code, name, description,
  activity_type, display_order, is_total_row, is_annual_only,
  field_mappings, computation_rules, validation_rules, metadata, is_active
) VALUES
-- HC Nurses Salary
(@hr_category_id, 'HIV', 'health_center', 'HR_HC_NURSES_SALARY', 
 'Provide salaries for health facilities staff (DHs, HCs)', 
 'Monthly salary payments for Health Center Nurses (A1 level)',
 'HC Nurses (A1) Salary', 1, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 100, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Monthly", "suggestedUnitCost": 1500, "category": "Salary", "priority": "High"}'::jsonb,
 true),

-- Lab Technician Salary  
(@hr_category_id, 'HIV', 'health_center', 'HR_LAB_TECH_SALARY',
 'Provide salaries for health facilities staff (DHs, HCs)',
 'Monthly salary payments for Health Center Lab Technicians (A1 level)',
 'HC Lab Technician (A1) Salary', 2, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 100, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Monthly", "suggestedUnitCost": 1000, "category": "Salary", "priority": "High"}'::jsonb,
 true),

-- Staff Bonus
(@hr_category_id, 'HIV', 'health_center', 'HR_STAFF_BONUS',
 'Provide salaries for health facilities staff (DHs, HCs)',
 'Performance bonuses for all staff paid on GF funding',
 'Bonus (All staff paid on GF)', 3, false, true,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 50, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Quarterly", "suggestedUnitCost": 500, "category": "Bonus", "priority": "Medium", "isAnnualBonus": true}'::jsonb,
 true);

-- Travel Related Costs Activities
INSERT INTO dynamic_activities (
  category_id, project_type, facility_type, code, name, description,
  activity_type, display_order, is_total_row, is_annual_only,
  field_mappings, computation_rules, validation_rules, metadata, is_active
) VALUES
-- Workshop/Support Groups
(@trc_category_id, 'HIV', 'health_center', 'TRC_WORKSHOP',
 'Conduct support group meeting at Health Facilities especially for adolescents and children',
 'Support group meetings and workshops for adolescents and children',
 'Workshop', 1, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 10, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Monthly", "suggestedUnitCost": 200, "category": "Workshop", "priority": "High"}'::jsonb,
 true),

-- CHW Supervision
(@trc_category_id, 'HIV', 'health_center', 'TRC_CHW_SUPERVISION',
 'Conduct supervision from Health centers to CHWs',
 'Regular supervision visits from Health Centers to Community Health Workers',
 'Supervision (CHWs)', 2, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 10, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Bi-weekly", "suggestedUnitCost": 150, "category": "Supervision", "priority": "High"}'::jsonb,
 true),

-- Home Visits
(@trc_category_id, 'HIV', 'health_center', 'TRC_HOME_VISITS',
 'Conduct home visit for lost to follow up',
 'Home visits for patients lost to follow-up',
 'Supervision (Home Visit)', 3, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 10, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Weekly", "suggestedUnitCost": 100, "category": "Home Visit", "priority": "High"}'::jsonb,
 true),

-- Sample Transport
(@trc_category_id, 'HIV', 'health_center', 'TRC_SAMPLE_TRANSPORT',
 'Conduct sample transportation from Health centers to District Hospitals',
 'Transportation of samples from Health Centers to District Hospitals',
 'Transport', 4, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 5, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Bi-weekly", "suggestedUnitCost": 75, "category": "Transport", "priority": "Medium"}'::jsonb,
 true);

-- Health Products & Equipment Activities
INSERT INTO dynamic_activities (
  category_id, project_type, facility_type, code, name, description,
  activity_type, display_order, is_total_row, is_annual_only,
  field_mappings, computation_rules, validation_rules, metadata, is_active
) VALUES
-- Maintenance and Repair
(@hpe_category_id, 'HIV', 'health_center', 'HPE_MAINTENANCE_REPAIR',
 'Support to DHs and HCs to improve and maintain infrastructure standards',
 'Infrastructure maintenance and repair activities',
 'Maintenance and Repair', 1, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 100, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Quarterly", "suggestedUnitCost": 2500, "category": "Infrastructure", "priority": "Medium"}'::jsonb,
 true);

-- Program Administration Costs Activities
INSERT INTO dynamic_activities (
  category_id, project_type, facility_type, code, name, description,
  activity_type, display_order, is_total_row, is_annual_only,
  field_mappings, computation_rules, validation_rules, metadata, is_active
) VALUES
-- Communication
(@pac_category_id, 'HIV', 'health_center', 'PAC_COMMUNICATION',
 'Provide running costs for DHs & HCs',
 'Communication costs including phone, internet, and postal services',
 'Communication', 1, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 10, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Monthly", "suggestedUnitCost": 200, "category": "Communication", "priority": "Medium"}'::jsonb,
 true),

-- Office Supplies
(@pac_category_id, 'HIV', 'health_center', 'PAC_OFFICE_SUPPLIES',
 'Provide running costs for DHs & HCs',
 'Office supplies, stationery, and consumables',
 'Office Supplies', 2, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 5, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Monthly", "suggestedUnitCost": 100, "category": "Supplies", "priority": "Low"}'::jsonb,
 true),

-- Mission & Reporting Transport
(@pac_category_id, 'HIV', 'health_center', 'PAC_MISSION_TRANSPORT',
 'Provide running costs for DHs & HCs',
 'Transport costs for missions, meetings, and reporting activities',
 'Transport (Mission & Reporting Fee)', 3, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 10, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Bi-weekly", "suggestedUnitCost": 125, "category": "Transport", "priority": "Medium"}'::jsonb,
 true),

-- Bank Charges
(@pac_category_id, 'HIV', 'health_center', 'PAC_BANK_CHARGES',
 'Provide running costs for DHs & HCs',
 'Banking fees, transaction charges, and financial service costs',
 'Bank charges', 4, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 1, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Monthly", "suggestedUnitCost": 25, "category": "Banking", "priority": "Low"}'::jsonb,
 true);

-- =====================================================================
-- 4. CREATE FORM FIELDS
-- =====================================================================

-- Common fields for all activities
INSERT INTO form_fields (
  schema_id, field_key, label, field_type, is_required, display_order,
  field_config, validation_rules, default_value, help_text, is_visible, is_editable
) VALUES
-- Frequency field
(@schema_id, 'frequency', 'Frequency', 'select', true, 1,
 '{"options": [{"value": "Weekly", "label": "Weekly"}, {"value": "Bi-weekly", "label": "Bi-weekly"}, {"value": "Monthly", "label": "Monthly"}, {"value": "Quarterly", "label": "Quarterly"}, {"value": "Semi-Annual", "label": "Semi-Annual"}, {"value": "Annual", "label": "Annual"}], "placeholder": "Select frequency"}'::jsonb,
 '{"required": true}'::jsonb,
 '"Monthly"'::jsonb,
 'How often this activity occurs during the period',
 true, true),

-- Unit Cost field
(@schema_id, 'unit_cost', 'Unit Cost ($)', 'currency', true, 2,
 '{"currency": "USD", "precision": 2, "min": 0, "placeholder": "0.00"}'::jsonb,
 '{"required": true, "min": 0, "type": "number"}'::jsonb,
 '0'::jsonb,
 'Cost per unit of this activity',
 true, true),

-- Q1 Count
(@schema_id, 'count_q1', 'Count Q1', 'number', false, 3,
 '{"min": 0, "step": 1, "placeholder": "0"}'::jsonb,
 '{"min": 0, "type": "integer"}'::jsonb,
 '0'::jsonb,
 'Number of units planned for Q1 (Jul-Sep)',
 true, true),

-- Q2 Count
(@schema_id, 'count_q2', 'Count Q2', 'number', false, 4,
 '{"min": 0, "step": 1, "placeholder": "0"}'::jsonb,
 '{"min": 0, "type": "integer"}'::jsonb,
 '0'::jsonb,
 'Number of units planned for Q2 (Oct-Dec)',
 true, true),

-- Q3 Count
(@schema_id, 'count_q3', 'Count Q3', 'number', false, 5,
 '{"min": 0, "step": 1, "placeholder": "0"}'::jsonb,
 '{"min": 0, "type": "integer"}'::jsonb,
 '0'::jsonb,
 'Number of units planned for Q3 (Jan-Mar)',
 true, true),

-- Q4 Count
(@schema_id, 'count_q4', 'Count Q4', 'number', false, 6,
 '{"min": 0, "step": 1, "placeholder": "0"}'::jsonb,
 '{"min": 0, "type": "integer"}'::jsonb,
 '0'::jsonb,
 'Number of units planned for Q4 (Apr-Jun)',
 true, true),

-- Q1 Amount (calculated)
(@schema_id, 'amount_q1', 'Amount Q1 ($)', 'calculated', false, 7,
 '{"currency": "USD", "precision": 2, "readOnly": true}'::jsonb,
 '{}'::jsonb,
 '0'::jsonb,
 'Calculated: Unit Cost × Count Q1 × Frequency (auto-calculated)',
 true, false),

-- Q2 Amount (calculated)
(@schema_id, 'amount_q2', 'Amount Q2 ($)', 'calculated', false, 8,
 '{"currency": "USD", "precision": 2, "readOnly": true}'::jsonb,
 '{}'::jsonb,
 '0'::jsonb,
 'Calculated: Unit Cost × Count Q2 × Frequency (auto-calculated)',
 true, false),

-- Q3 Amount (calculated)
(@schema_id, 'amount_q3', 'Amount Q3 ($)', 'calculated', false, 9,
 '{"currency": "USD", "precision": 2, "readOnly": true}'::jsonb,
 '{}'::jsonb,
 '0'::jsonb,
 'Calculated: Unit Cost × Count Q3 × Frequency (auto-calculated)',
 true, false),

-- Q4 Amount (calculated)
(@schema_id, 'amount_q4', 'Amount Q4 ($)', 'calculated', false, 10,
 '{"currency": "USD", "precision": 2, "readOnly": true}'::jsonb,
 '{}'::jsonb,
 '0'::jsonb,
 'Calculated: Unit Cost × Count Q4 × Frequency (auto-calculated)',
 true, false),

-- Total Amount (calculated)
(@schema_id, 'total_amount', 'Total ($)', 'calculated', false, 11,
 '{"currency": "USD", "precision": 2, "readOnly": true, "highlight": true}'::jsonb,
 '{}'::jsonb,
 '0'::jsonb,
 'Calculated: Sum of all quarterly amounts (auto-calculated)',
 true, false),

-- Comment field
(@schema_id, 'comment', 'Comments', 'textarea', false, 12,
 '{"rows": 2, "maxLength": 500, "placeholder": "Optional comments or notes..."}'::jsonb,
 '{"maxLength": 500}'::jsonb,
 '""'::jsonb,
 'Optional comments or additional notes for this activity',
 true, true);

-- =====================================================================
-- 5. CREATE SYSTEM CONFIGURATIONS
-- =====================================================================

-- Planning module configuration
INSERT INTO system_configurations (config_key, config_value, description, config_type, scope, is_active)
VALUES 
('hiv_hc_planning_config', 
 '{
   "autoCalculation": true,
   "allowNegativeValues": false,
   "quarterlyStructure": ["Q1 (Jul-Sep)", "Q2 (Oct-Dec)", "Q3 (Jan-Mar)", "Q4 (Apr-Jun)"],
   "defaultCurrency": "USD",
   "validationRules": {
     "requirePositiveBudget": true,
     "maxBudgetPerActivity": 100000,
     "maxTotalBudget": 500000
   },
   "calculationFormulas": {
     "quarterlyAmount": "unitCost * count * frequency",
     "totalAmount": "amountQ1 + amountQ2 + amountQ3 + amountQ4"
   }
 }'::jsonb,
 'Configuration for HIV Health Center Planning module',
 'planning',
 'PROJECT',
 true),

-- Form display configuration
('hiv_hc_form_display', 
 '{
   "showCalculatedFields": true,
   "enableAutoSave": true,
   "collapsibleSections": true,
   "showTotalsByCategory": true,
   "showGrandTotal": true,
   "highlightRequiredFields": true,
   "enableFieldHelp": true
 }'::jsonb,
 'Display configuration for HIV Health Center forms',
 'form',
 'GLOBAL',
 true);

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

-- Verify the migration results
SELECT 
  'form_schemas' as table_name,
  COUNT(*) as record_count,
  STRING_AGG(name, ', ') as names
FROM form_schemas 
WHERE project_type = 'HIV' AND facility_type = 'health_center' AND module_type = 'planning'

UNION ALL

SELECT 
  'schema_activity_categories' as table_name,
  COUNT(*) as record_count,
  STRING_AGG(name, ', ') as names
FROM schema_activity_categories 
WHERE project_type = 'HIV' AND facility_type = 'health_center'

UNION ALL

SELECT 
  'dynamic_activities' as table_name,
  COUNT(*) as record_count,
  CONCAT(COUNT(*), ' activities across categories') as names
FROM dynamic_activities 
WHERE project_type = 'HIV' AND facility_type = 'health_center'

UNION ALL

SELECT 
  'form_fields' as table_name,
  COUNT(*) as record_count,
  STRING_AGG(DISTINCT field_type::text, ', ') as names
FROM form_fields 
WHERE schema_id = @schema_id;

COMMIT;

-- =====================================================================
-- MIGRATION NOTES
-- =====================================================================

/*
MIGRATION SUMMARY:
This script migrates the hard-coded HIV Health Center Planning form to a schema-driven approach by creating:

1. FORM SCHEMA (1 record):
   - HIV Health Center Planning Form v1.0
   - Defines 4 sections: HR, TRC, HPE, PAC
   - Includes calculation formulas and validation rules

2. ACTIVITY CATEGORIES (4 records):
   - Human Resources (HR)
   - Travel Related Costs (TRC) 
   - Health Products & Equipment (HPE)
   - Program Administration Costs (PAC)

3. DYNAMIC ACTIVITIES (11 records):
   HR: HC Nurses Salary, Lab Technician Salary, Staff Bonus
   TRC: Workshop, CHW Supervision, Home Visits, Sample Transport
   HPE: Maintenance and Repair
   PAC: Communication, Office Supplies, Mission Transport, Bank Charges

4. FORM FIELDS (12 records):
   - frequency (select dropdown)
   - unit_cost (currency input)
   - count_q1, count_q2, count_q3, count_q4 (number inputs)
   - amount_q1, amount_q2, amount_q3, amount_q4 (calculated fields)
   - total_amount (calculated field)
   - comment (textarea)

5. SYSTEM CONFIGURATIONS (2 records):
   - Planning module configuration
   - Form display configuration

USAGE AFTER MIGRATION:
1. Forms will be dynamically generated based on form_schemas
2. Activities will be loaded from dynamic_activities table
3. Field definitions from form_fields will control input types and validation
4. Calculations will be performed using the computation_rules from activities
5. Event mappings can be configured through configurable_event_mappings table

BACKWARD COMPATIBILITY:
- Legacy planning data structures remain unchanged
- Migration can run alongside existing system
- Gradual transition possible by feature-flagging schema-driven forms

NEXT STEPS:
1. Create similar schemas for Hospital facilities
2. Create schemas for Execution module
3. Create schemas for TB and Malaria projects
4. Build event mappings for financial statement generation
5. Implement form rendering engine that uses this schema data

TESTING RECOMMENDATIONS:
1. Verify all records inserted correctly using the verification queries
2. Test form generation with the new schema
3. Validate calculations work as expected
4. Ensure data compatibility between old and new systems
5. Test with actual planning data entry

ROLLBACK PLAN:
If migration needs to be rolled back:
1. Drop or disable the schema-driven configuration
2. Re-enable hard-coded forms
3. Preserve any data entered during schema-driven phase
4. No data loss as legacy tables remain untouched
*/