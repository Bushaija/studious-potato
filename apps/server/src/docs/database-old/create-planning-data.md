-- PLANNING DATA CREATION DEMO
-- This demonstrates the complete dependency chain needed to create planning_data records

-- ====================================================================
-- STEP 1: CREATE FOUNDATIONAL DATA (Geographic & Administrative)
-- ====================================================================

-- Create province
INSERT INTO provinces (name) 
VALUES ('Kigali Province') 
RETURNING id;
-- Let's assume this returns id = 1

-- Create district
INSERT INTO districts (name, province_id) 
VALUES ('Gasabo District', 1)
RETURNING id;
-- Let's assume this returns id = 1

-- Create facility
INSERT INTO facilities (name, facility_type, district_id) 
VALUES ('Kigali University Teaching Hospital', 'hospital', 1)
RETURNING id;
-- Let's assume this returns id = 1

-- ====================================================================
-- STEP 2: CREATE PROJECT AND REPORTING PERIOD
-- ====================================================================

-- Create project (REQUIRED - planning_data has NOT NULL constraint)
INSERT INTO projects (name, code, description, project_type, status) 
VALUES (
    'Rwanda HIV Prevention Program 2024',
    'HIV2024',
    'Comprehensive HIV prevention and treatment program focusing on high-risk populations',
    'HIV',
    'ACTIVE'
)
RETURNING id;
-- Let's assume this returns id = 1

-- Create reporting period (REQUIRED)
INSERT INTO reporting_periods (year, period_type, start_date, end_date, status) 
VALUES (
    2024,
    'ANNUAL',
    '2024-01-01',
    '2024-12-31',
    'ACTIVE'
)
RETURNING id;
-- Let's assume this returns id = 1

-- ====================================================================
-- STEP 3: CREATE PLANNING STRUCTURE (Categories & Activities)
-- ====================================================================

-- Create planning category (REQUIRED - must match facility_type)
INSERT INTO planning_categories (
    project_id, 
    facility_type, 
    code, 
    name, 
    display_order
) 
VALUES (
    1,                    -- project_id (matches our HIV project)
    'hospital',           -- facility_type (matches our facility type)
    'PREV001',           -- unique code within project+facility_type
    'HIV Prevention Services',
    1                    -- display_order
)
RETURNING id;
-- Let's assume this returns id = 1

-- Create planning activity (REQUIRED - direct parent of planning_data)
INSERT INTO planning_activities (
    category_id,
    facility_type,
    name,
    display_order,
    is_total_row,
    project_id
) 
VALUES (
    1,                   -- category_id (our planning category)
    'hospital',          -- facility_type (must match category and facility)
    'HIV Testing and Counseling Services',
    1,                   -- display_order
    false,               -- is_total_row
    1                    -- project_id (must match category project)
)
RETURNING id;
-- Let's assume this returns id = 1

-- ====================================================================
-- STEP 4: CREATE PLANNING DATA (THE TARGET RECORD)
-- ====================================================================

-- Now we can create planning_data with all dependencies satisfied
INSERT INTO planning_data (
    activity_id,         -- FK to planning_activities
    facility_id,         -- FK to facilities  
    reporting_period_id, -- FK to reporting_periods
    project_id,          -- FK to projects
    frequency,           -- How often the activity occurs
    unit_cost,           -- Cost per occurrence
    count_q1,            -- Planned occurrences in Q1
    count_q2,            -- Planned occurrences in Q2
    count_q3,            -- Planned occurrences in Q3
    count_q4,            -- Planned occurrences in Q4
    comment              -- Optional planning notes
) 
VALUES (
    1,                   -- activity_id (HIV Testing activity)
    1,                   -- facility_id (Kigali University Teaching Hospital)
    1,                   -- reporting_period_id (2024 annual period)
    1,                   -- project_id (HIV Prevention Program)
    12.00,               -- frequency (monthly service)
    25000.00,            -- unit_cost (25,000 RWF per testing session)
    3,                   -- count_q1 (3 sessions planned in Q1)
    3,                   -- count_q2 (3 sessions planned in Q2) 
    4,                   -- count_q3 (4 sessions planned in Q3)
    2,                   -- count_q4 (2 sessions planned in Q4)
    'Increased Q3 activities due to World AIDS Day campaign'
);

-- ====================================================================
-- VERIFICATION QUERY - Check the created planning_data with calculations
-- ====================================================================

SELECT 
    pd.id,
    pr.name as project_name,
    pr.code as project_code,
    pc.name as category_name,
    pa.name as activity_name,
    f.name as facility_name,
    f.facility_type,
    rp.year as reporting_year,
    pd.frequency,
    pd.unit_cost,
    pd.count_q1,
    pd.count_q2, 
    pd.count_q3,
    pd.count_q4,
    -- These are automatically calculated by generated columns:
    pd.amount_q1,        -- frequency * unit_cost * count_q1
    pd.amount_q2,        -- frequency * unit_cost * count_q2
    pd.amount_q3,        -- frequency * unit_cost * count_q3
    pd.amount_q4,        -- frequency * unit_cost * count_q4
    pd.total_budget,     -- frequency * unit_cost * (count_q1+q2+q3+q4)
    pd.comment,
    pd.created_at
FROM planning_data pd
JOIN planning_activities pa ON pa.id = pd.activity_id
JOIN planning_categories pc ON pc.id = pa.category_id  
JOIN projects pr ON pr.id = pd.project_id
JOIN facilities f ON f.id = pd.facility_id
JOIN reporting_periods rp ON rp.id = pd.reporting_period_id
WHERE pd.project_id = 1;

-- ====================================================================
-- WHAT WOULD CAUSE INSERTION FAILURES?
-- ====================================================================

-- Example of FAILED insertions and why they would fail:

-- FAILURE 1: Invalid activity_id (violates FK constraint)
/*
INSERT INTO planning_data (activity_id, facility_id, reporting_period_id, project_id, frequency, unit_cost, count_q1, count_q2, count_q3, count_q4) 
VALUES (999, 1, 1, 1, 12.00, 25000.00, 1, 1, 1, 1);
-- ERROR: violates foreign key constraint "planning_data_activity_id_fkey"
*/

-- FAILURE 2: Mismatched project_id (activity belongs to different project)
/*
INSERT INTO planning_data (activity_id, facility_id, reporting_period_id, project_id, frequency, unit_cost, count_q1, count_q2, count_q3, count_q4) 
VALUES (1, 1, 1, 2, 12.00, 25000.00, 1, 1, 1, 1);
-- This might succeed at DB level but violates business logic consistency
*/

-- FAILURE 3: Duplicate combination (violates unique constraint)
/*
INSERT INTO planning_data (activity_id, facility_id, reporting_period_id, project_id, frequency, unit_cost, count_q1, count_q2, count_q3, count_q4) 
VALUES (1, 1, 1, 1, 6.00, 15000.00, 2, 2, 2, 2);
-- ERROR: violates unique constraint "plan_data_unique"
*/

-- FAILURE 4: NULL required fields
/*
INSERT INTO planning_data (activity_id, facility_id, reporting_period_id, project_id, unit_cost, count_q1, count_q2, count_q3, count_q4) 
VALUES (1, 1, 1, 1, 25000.00, 1, 1, 1, 1);
-- ERROR: null value in column "frequency" violates not-null constraint
*/

-- ====================================================================
-- BUSINESS LOGIC VALIDATION QUERY
-- ====================================================================

-- Query to validate that planning_data relationships make business sense
SELECT 
    'Planning Data Validation' as check_type,
    pd.id as planning_data_id,
    CASE 
        WHEN pa.project_id = pd.project_id THEN 'VALID'
        ELSE 'INVALID - Project Mismatch'
    END as project_consistency,
    CASE 
        WHEN pa.facility_type = f.facility_type THEN 'VALID'
        ELSE 'INVALID - Facility Type Mismatch'
    END as facility_type_consistency,
    CASE 
        WHEN pc.project_id = pd.project_id THEN 'VALID'
        ELSE 'INVALID - Category Project Mismatch'
    END as category_consistency
FROM planning_data pd
JOIN planning_activities pa ON pa.id = pd.activity_id
JOIN planning_categories pc ON pc.id = pa.category_id
JOIN facilities f ON f.id = pd.facility_id
WHERE pd.id = 1;