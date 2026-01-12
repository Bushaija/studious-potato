-- =====================================================================
-- HIV HOSPITAL PLANNING MODULE SEEDING QUERY
-- =====================================================================
-- This script creates the schema-driven configuration for HIV Hospital
-- planning forms, including form schemas, activity categories, dynamic activities,
-- and form fields based on the hospital activities data.

BEGIN;

-- =====================================================================
-- 1. CREATE FORM SCHEMA
-- =====================================================================

INSERT INTO form_schemas (name, version, project_type, facility_type, module_type, is_active, schema, metadata, created_by)
VALUES (
  'HIV Hospital Planning Form',
  '1.0',
  'HIV',
  'hospital',
  'planning',
  true,
  '{
    "formId": "hiv_hospital_planning",
    "title": "HIV Hospital Planning",
    "description": "Annual planning form for HIV programs at Hospitals with quarterly breakdown",
    "version": "1.0",
    "moduleType": "planning",
    "sections": [
      {
        "id": "hr_section",
        "title": "Human Resources (HR)",
        "description": "Medical staff salaries and compensation planning",
        "order": 1,
        "categoryCode": "HR",
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "amount_q1", "amount_q2", "amount_q3", "amount_q4", "total_amount", "comment"],
        "isCollapsible": true,
        "defaultExpanded": true
      },
      {
        "id": "trc_section",
        "title": "Travel Related Costs (TRC)",
        "description": "Training, supervision, outreach and campaign activities",
        "order": 2,
        "categoryCode": "TRC",
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "amount_q1", "amount_q2", "amount_q3", "amount_q4", "total_amount", "comment"],
        "isCollapsible": true,
        "defaultExpanded": true
      },
      {
        "id": "hpe_section",
        "title": "Health Products & Equipment (HPE)",
        "description": "Equipment, vehicles, and infrastructure maintenance",
        "order": 3,
        "categoryCode": "HPE",
        "fields": ["frequency", "unit_cost", "count_q1", "count_q2", "count_q3", "count_q4", "amount_q1", "amount_q2", "amount_q3", "amount_q4", "total_amount", "comment"],
        "isCollapsible": true,
        "defaultExpanded": true
      },
      {
        "id": "pac_section",
        "title": "Program Administration Costs (PAC)",
        "description": "Administrative costs, databases, and operational expenses",
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
    "createdFor": "HIV Hospital Planning Migration",
    "basedOn": "hospital_activities_schema",
    "migrationDate": "2024-01-01",
    "quarterlyStructure": true,
    "supportedCalculations": ["auto_amount", "auto_total"],
    "compatibleWith": ["legacy_planning_data"],
    "facilityLevel": "hospital"
  }'::jsonb,
  1
);

-- Get the form schema ID for foreign key references
SET @hospital_schema_id = LAST_INSERT_ID();

-- =====================================================================
-- 2. CREATE ACTIVITY CATEGORIES (Hospital Level)
-- =====================================================================

-- Human Resources Category
INSERT INTO schema_activity_categories (
  project_type, facility_type, code, name, description, display_order, 
  is_computed, metadata, is_active
) VALUES (
  'HIV', 'hospital', 'HR', 'Human Resources (HR)', 
  'Medical staff salaries, bonuses, and human resource costs for hospital level', 1, 
  false, 
  '{"section": "hr_section", "icon": "users", "color": "#3B82F6", "facilityLevel": "hospital"}'::jsonb, 
  true
);

SET @hospital_hr_category_id = LAST_INSERT_ID();

-- Travel Related Costs Category  
INSERT INTO schema_activity_categories (
  project_type, facility_type, code, name, description, display_order,
  is_computed, metadata, is_active
) VALUES (
  'HIV', 'hospital', 'TRC', 'Travel Related Costs (TRC)',
  'Training, supervision, outreach campaigns, and travel-related activities at hospital level', 2,
  false,
  '{"section": "trc_section", "icon": "car", "color": "#10B981", "facilityLevel": "hospital"}'::jsonb,
  true
);

SET @hospital_trc_category_id = LAST_INSERT_ID();

-- Health Products & Equipment Category
INSERT INTO schema_activity_categories (
  project_type, facility_type, code, name, description, display_order,
  is_computed, metadata, is_active
) VALUES (
  'HIV', 'hospital', 'HPE', 'Health Products & Equipment (HPE)',
  'Medical equipment, vehicles, infrastructure maintenance at hospital level', 3,
  false,
  '{"section": "hpe_section", "icon": "medical-kit", "color": "#F59E0B", "facilityLevel": "hospital"}'::jsonb,
  true
);

SET @hospital_hpe_category_id = LAST_INSERT_ID();

-- Program Administration Costs Category
INSERT INTO schema_activity_categories (
  project_type, facility_type, code, name, description, display_order,
  is_computed, metadata, is_active
) VALUES (
  'HIV', 'hospital', 'PAC', 'Program Administration Costs (PAC)',
  'Administrative costs, databases, fuel, communications at hospital level', 4,
  false,
  '{"section": "pac_section", "icon": "briefcase", "color": "#8B5CF6", "facilityLevel": "hospital"}'::jsonb,
  true
);

SET @hospital_pac_category_id = LAST_INSERT_ID();

-- =====================================================================
-- 3. CREATE DYNAMIC ACTIVITIES (Hospital Level)
-- =====================================================================

-- Human Resources Activities (Hospital)
INSERT INTO dynamic_activities (
  category_id, project_type, facility_type, code, name, description,
  activity_type, display_order, is_total_row, is_annual_only,
  field_mappings, computation_rules, validation_rules, metadata, is_active
) VALUES
-- DH Medical Dr. Salary
(@hospital_hr_category_id, 'HIV', 'hospital', 'HR_DH_MEDICAL_DR_SALARY', 
 'Provide salaries for health facilities staff (DHs, HCs)', 
 'Monthly salary payments for District Hospital Medical Doctors',
 'DH Medical Dr. Salary', 1, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 1000, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Monthly", "suggestedUnitCost": 3000, "category": "Medical Staff", "priority": "Critical", "level": "District Hospital"}'::jsonb,
 true),

-- Senior Medical Dr. Salary  
(@hospital_hr_category_id, 'HIV', 'hospital', 'HR_SENIOR_MEDICAL_DR_SALARY',
 'Provide salaries for health facilities staff (DHs, HCs)',
 'Monthly salary payments for Senior Medical Doctors',
 'Senior Medical Dr. Salary', 2, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 1500, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Monthly", "suggestedUnitCost": 4000, "category": "Medical Staff", "priority": "Critical", "level": "Senior"}'::jsonb,
 true),

-- Chief Medical Dr. Salary
(@hospital_hr_category_id, 'HIV', 'hospital', 'HR_CHIEF_MEDICAL_DR_SALARY',
 'Provide salaries for health facilities staff (DHs, HCs)',
 'Monthly salary payments for Chief Medical Doctors',
 'Chief Medical Dr. Salary', 3, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 2000, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Monthly", "suggestedUnitCost": 5000, "category": "Medical Staff", "priority": "Critical", "level": "Chief"}'::jsonb,
 true),

-- Junior Medical Dr./Mentor Salary
(@hospital_hr_category_id, 'HIV', 'hospital', 'HR_JUNIOR_MEDICAL_DR_SALARY',
 'Provide salaries for health facilities staff (DHs, HCs)',
 'Monthly salary payments for Junior Medical Doctors or Mentors',
 'Junior Medical Dr. or Mentor Salary', 4, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 800, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Monthly", "suggestedUnitCost": 2500, "category": "Medical Staff", "priority": "High", "level": "Junior/Mentor"}'::jsonb,
 true),

-- Pharmacist Salary
(@hospital_hr_category_id, 'HIV', 'hospital', 'HR_PHARMACIST_SALARY',
 'Provide salaries for health facilities staff (DHs, HCs)',
 'Monthly salary payments for Hospital Pharmacists',
 'Pharmacist Salary', 5, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 600, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Monthly", "suggestedUnitCost": 2000, "category": "Support Staff", "priority": "High"}'::jsonb,
 true),

-- Nurse Salary
(@hospital_hr_category_id, 'HIV', 'hospital', 'HR_NURSE_SALARY',
 'Provide salaries for health facilities staff (DHs, HCs)',
 'Monthly salary payments for Hospital Nurses',
 'Nurse Salary', 6, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 400, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Monthly", "suggestedUnitCost": 1500, "category": "Nursing Staff", "priority": "High"}'::jsonb,
 true),

-- CHW Supervisor Salary
(@hospital_hr_category_id, 'HIV', 'hospital', 'HR_CHW_SUPERVISOR_SALARY',
 'Provide salaries for health facilities staff (DHs, HCs)',
 'Monthly salary payments for Community Health Worker Supervisors',
 'CHW supervisor Salary', 7, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 300, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Monthly", "suggestedUnitCost": 1200, "category": "Support Staff", "priority": "Medium"}'::jsonb,
 true),

-- Accountant Salary
(@hospital_hr_category_id, 'HIV', 'hospital', 'HR_ACCOUNTANT_SALARY',
 'Provide salaries for health facilities staff (DHs, HCs)',
 'Monthly salary payments for Hospital Accountants',
 'Accountant Salary', 8, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 400, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Monthly", "suggestedUnitCost": 1800, "category": "Administrative Staff", "priority": "Medium"}'::jsonb,
 true),

-- All Staff Bonus
(@hospital_hr_category_id, 'HIV', 'hospital', 'HR_ALL_STAFF_BONUS',
 'Provide bonus for 2023-24',
 'Annual performance bonuses for all hospital staff',
 'All Staff Bonus', 9, false, true,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 100, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Annual", "suggestedUnitCost": 1000, "category": "Bonus", "priority": "Medium", "isAnnualBonus": true}'::jsonb,
 true);

-- Travel Related Costs Activities (Hospital)
INSERT INTO dynamic_activities (
  category_id, project_type, facility_type, code, name, description,
  activity_type, display_order, is_total_row, is_annual_only,
  field_mappings, computation_rules, validation_rules, metadata, is_active
) VALUES
-- HIV Testing Campaigns
(@hospital_trc_category_id, 'HIV', 'hospital', 'TRC_HIV_TESTING_CAMPAIGN',
 'Conduct outreach to provide HIV testing service in communities',
 'Community outreach campaigns for HIV testing services',
 'Campaign for HIV testing', 1, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 100, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Monthly", "suggestedUnitCost": 1500, "category": "Campaign", "priority": "High", "targetGroup": "Community"}'::jsonb,
 true),

-- VMMC Campaigns
(@hospital_trc_category_id, 'HIV', 'hospital', 'TRC_VMMC_CAMPAIGN',
 'Conduct outreach VMMC provision at decentralized level',
 'Outreach campaigns for Voluntary Medical Male Circumcision',
 'Campaign (All)', 2, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 200, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Monthly", "suggestedUnitCost": 2000, "category": "Campaign", "priority": "High", "targetGroup": "Male Population"}'::jsonb,
 true),

-- Peer Educator Training
(@hospital_trc_category_id, 'HIV', 'hospital', 'TRC_PEER_EDUCATOR_TRAINING',
 'Conduct training of Peer educators for Negative partner of Sero-Discordant couples on HIV and AIDS and sexual health issues',
 'Training programs for peer educators working with sero-discordant couples',
 'Training', 3, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 300, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Quarterly", "suggestedUnitCost": 1000, "category": "Training", "priority": "High", "targetGroup": "Peer Educators"}'::jsonb,
 true),

-- Clinical Mentorship Supervision
(@hospital_trc_category_id, 'HIV', 'hospital', 'TRC_CLINICAL_SUPERVISION',
 'Conduct integrated clinical mentorship from District Hospital to Health centres to support Treat All and DSDM implementation',
 'Clinical mentorship and supervision from hospital to health centers',
 'Supervision (All)', 4, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 200, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Monthly", "suggestedUnitCost": 800, "category": "Supervision", "priority": "High", "focus": "Clinical Mentorship"}'::jsonb,
 true),

-- MDT Meetings
(@hospital_trc_category_id, 'HIV', 'hospital', 'TRC_MDT_MEETINGS',
 'Conduct quarterly multidisciplinary team meeting (MDT). Participants are those not supported by other donor',
 'Quarterly multidisciplinary team meetings',
 'Workshop (Transport & Perdiem)', 5, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 500, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Quarterly", "suggestedUnitCost": 1500, "category": "Meeting", "priority": "Medium", "type": "Multidisciplinary"}'::jsonb,
 true),

-- Support Group Meetings
(@hospital_trc_category_id, 'HIV', 'hospital', 'TRC_SUPPORT_GROUP_MEETINGS',
 'Conduct support group meeting at Health Facilities especially for adolescents and children and younger adults',
 'Support group meetings for adolescents, children, and younger adults',
 'Meeting', 6, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 100, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Monthly", "suggestedUnitCost": 400, "category": "Support Group", "priority": "High", "targetGroup": "Adolescents & Children"}'::jsonb,
 true),

-- Sample Transport to Referral
(@hospital_trc_category_id, 'HIV', 'hospital', 'TRC_SAMPLE_TRANSPORT_REFERRAL',
 'Conduct sample transportation from District Hospitals to Referral hospitals/NRL',
 'Transportation of samples from District Hospitals to Referral hospitals/National Reference Laboratory',
 'Transport', 7, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 50, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Weekly", "suggestedUnitCost": 200, "category": "Transport", "priority": "High", "destination": "Referral/NRL"}'::jsonb,
 true);

-- Health Products & Equipment Activities (Hospital)
INSERT INTO dynamic_activities (
  category_id, project_type, facility_type, code, name, description,
  activity_type, display_order, is_total_row, is_annual_only,
  field_mappings, computation_rules, validation_rules, metadata, is_active
) VALUES
-- Vehicle Maintenance
(@hospital_hpe_category_id, 'HIV', 'hospital', 'HPE_VEHICLE_MAINTENANCE',
 'Support to DHs and HCs to improve and maintain infrastructure standards- Motor car Vehicles',
 'Maintenance and repair of motor vehicles and transportation equipment',
 'Maintenance', 1, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 200, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Monthly", "suggestedUnitCost": 1000, "category": "Vehicle Maintenance", "priority": "Medium", "equipmentType": "Motor Vehicles"}'::jsonb,
 true);

-- Program Administration Costs Activities (Hospital)
INSERT INTO dynamic_activities (
  category_id, project_type, facility_type, code, name, description,
  activity_type, display_order, is_total_row, is_annual_only,
  field_mappings, computation_rules, validation_rules, metadata, is_active
) VALUES
-- Bank Charges & Commissions
(@hospital_pac_category_id, 'HIV', 'hospital', 'PAC_BANK_CHARGES',
 'National and sub-HIV databases',
 'Bank charges, commissions, and financial transaction fees for HIV database operations',
 'Bank charges & commissions', 1, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts": ["count_q1", "count_q2", "count_q3", "count_q4"], "amounts": ["amount_q1", "amount_q2", "amount_q3", "amount_q4"], "total": "total_amount", "comment": "comment"}'::jsonb,
 '{"amountFormula": "unit_cost * count * frequency", "totalFormula": "amount_q1 + amount_q2 + amount_q3 + amount_q4"}'::jsonb,
 '{"required": ["frequency", "unit_cost"], "minimums": {"unit_cost": 10, "frequency": 1}}'::jsonb,
 '{"defaultFrequency": "Monthly", "suggestedUnitCost": 150, "category": "Banking", "priority": "Low", "relatedTo": "HIV Databases"}'::jsonb,
 true),

-- Fuel Costs
(@hospital_pac_category_id, 'HIV', 'hospital', 'PAC_FUEL',
 'National and sub-HIV databases',
 'Fuel costs for vehicles and generators supporting HIV database operations',
 'Fuel', 2, false, false,
 '{"frequency": "frequency", "unitCost": "unit_cost", "counts":