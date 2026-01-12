-- Migration: Add VAT Receivable Line Items to Section E
-- This migration adds four new VAT receivable line items to Section E for all program/facility combinations
-- These line items track VAT receivables separately from regular payables

-- Step 1: Add VAT receivable line items for HIV Hospital
DO $$
DECLARE
    v_category_id INTEGER;
BEGIN
    -- Get the Section E category ID for HIV Hospital
    SELECT id INTO v_category_id
    FROM schema_activity_categories
    WHERE code = 'HIV_EXEC_HOSPITAL_E'
    AND module_type = 'execution';

    IF v_category_id IS NOT NULL THEN
        -- Insert VAT Receivable - Communication Airtime
        INSERT INTO dynamic_activities (
            category_id, project_type, facility_type, module_type,
            code, name, activity_type, display_order,
            is_total_row, is_active, metadata,
            created_at, updated_at
        ) VALUES (
            v_category_id, 'HIV', 'hospital', 'execution',
            'HIV_EXEC_HOSPITAL_E_VAT_AIRTIME',
            'VAT Receivable - Communication Airtime',
            'VAT_RECEIVABLE', 14,
            false, true,
            '{"isComputed": true, "vatCategory": "airtime"}'::jsonb,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (category_id, code) DO NOTHING;

        -- Insert VAT Receivable - Communication Internet
        INSERT INTO dynamic_activities (
            category_id, project_type, facility_type, module_type,
            code, name, activity_type, display_order,
            is_total_row, is_active, metadata,
            created_at, updated_at
        ) VALUES (
            v_category_id, 'HIV', 'hospital', 'execution',
            'HIV_EXEC_HOSPITAL_E_VAT_INTERNET',
            'VAT Receivable - Communication Internet',
            'VAT_RECEIVABLE', 15,
            false, true,
            '{"isComputed": true, "vatCategory": "internet"}'::jsonb,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (category_id, code) DO NOTHING;

        -- Insert VAT Receivable - Infrastructure Support
        INSERT INTO dynamic_activities (
            category_id, project_type, facility_type, module_type,
            code, name, activity_type, display_order,
            is_total_row, is_active, metadata,
            created_at, updated_at
        ) VALUES (
            v_category_id, 'HIV', 'hospital', 'execution',
            'HIV_EXEC_HOSPITAL_E_VAT_INFRASTRUCTURE',
            'VAT Receivable - Infrastructure Support',
            'VAT_RECEIVABLE', 16,
            false, true,
            '{"isComputed": true, "vatCategory": "infrastructure"}'::jsonb,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (category_id, code) DO NOTHING;

        -- Insert VAT Receivable - Office Supplies
        INSERT INTO dynamic_activities (
            category_id, project_type, facility_type, module_type,
            code, name, activity_type, display_order,
            is_total_row, is_active, metadata,
            created_at, updated_at
        ) VALUES (
            v_category_id, 'HIV', 'hospital', 'execution',
            'HIV_EXEC_HOSPITAL_E_VAT_SUPPLIES',
            'VAT Receivable - Office Supplies',
            'VAT_RECEIVABLE', 17,
            false, true,
            '{"isComputed": true, "vatCategory": "office_supplies"}'::jsonb,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (category_id, code) DO NOTHING;

        -- Update the total row display order to come after VAT receivables
        UPDATE dynamic_activities
        SET display_order = 18
        WHERE category_id = v_category_id
        AND name = 'E. Financial Liabilities'
        AND is_total_row = true;
    END IF;
END $$;

-- Step 2: Add VAT receivable line items for HIV Health Center
DO $$
DECLARE
    v_category_id INTEGER;
BEGIN
    -- Get the Section E category ID for HIV Health Center
    SELECT id INTO v_category_id
    FROM schema_activity_categories
    WHERE code = 'HIV_EXEC_HEALTH_CENTER_E'
    AND module_type = 'execution';

    IF v_category_id IS NOT NULL THEN
        -- Insert VAT Receivable - Communication Airtime
        INSERT INTO dynamic_activities (
            category_id, project_type, facility_type, module_type,
            code, name, activity_type, display_order,
            is_total_row, is_active, metadata,
            created_at, updated_at
        ) VALUES (
            v_category_id, 'HIV', 'health_center', 'execution',
            'HIV_EXEC_HEALTH_CENTER_E_VAT_AIRTIME',
            'VAT Receivable - Communication Airtime',
            'VAT_RECEIVABLE', 14,
            false, true,
            '{"isComputed": true, "vatCategory": "airtime"}'::jsonb,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (category_id, code) DO NOTHING;

        -- Insert VAT Receivable - Communication Internet
        INSERT INTO dynamic_activities (
            category_id, project_type, facility_type, module_type,
            code, name, activity_type, display_order,
            is_total_row, is_active, metadata,
            created_at, updated_at
        ) VALUES (
            v_category_id, 'HIV', 'health_center', 'execution',
            'HIV_EXEC_HEALTH_CENTER_E_VAT_INTERNET',
            'VAT Receivable - Communication Internet',
            'VAT_RECEIVABLE', 15,
            false, true,
            '{"isComputed": true, "vatCategory": "internet"}'::jsonb,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (category_id, code) DO NOTHING;

        -- Insert VAT Receivable - Infrastructure Support
        INSERT INTO dynamic_activities (
            category_id, project_type, facility_type, module_type,
            code, name, activity_type, display_order,
            is_total_row, is_active, metadata,
            created_at, updated_at
        ) VALUES (
            v_category_id, 'HIV', 'health_center', 'execution',
            'HIV_EXEC_HEALTH_CENTER_E_VAT_INFRASTRUCTURE',
            'VAT Receivable - Infrastructure Support',
            'VAT_RECEIVABLE', 16,
            false, true,
            '{"isComputed": true, "vatCategory": "infrastructure"}'::jsonb,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (category_id, code) DO NOTHING;

        -- Insert VAT Receivable - Office Supplies
        INSERT INTO dynamic_activities (
            category_id, project_type, facility_type, module_type,
            code, name, activity_type, display_order,
            is_total_row, is_active, metadata,
            created_at, updated_at
        ) VALUES (
            v_category_id, 'HIV', 'health_center', 'execution',
            'HIV_EXEC_HEALTH_CENTER_E_VAT_SUPPLIES',
            'VAT Receivable - Office Supplies',
            'VAT_RECEIVABLE', 17,
            false, true,
            '{"isComputed": true, "vatCategory": "office_supplies"}'::jsonb,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (category_id, code) DO NOTHING;

        -- Update the total row display order
        UPDATE dynamic_activities
        SET display_order = 18
        WHERE category_id = v_category_id
        AND name = 'E. Financial Liabilities'
        AND is_total_row = true;
    END IF;
END $$;

-- Step 3: Add VAT receivable line items for Malaria Hospital
DO $$
DECLARE
    v_category_id INTEGER;
BEGIN
    -- Get the Section E category ID for Malaria Hospital
    SELECT id INTO v_category_id
    FROM schema_activity_categories
    WHERE code = 'MAL_EXEC_HOSPITAL_E'
    AND module_type = 'execution';

    IF v_category_id IS NOT NULL THEN
        -- Insert VAT Receivable - Communication Airtime
        INSERT INTO dynamic_activities (
            category_id, project_type, facility_type, module_type,
            code, name, activity_type, display_order,
            is_total_row, is_active, metadata,
            created_at, updated_at
        ) VALUES (
            v_category_id, 'Malaria', 'hospital', 'execution',
            'MAL_EXEC_HOSPITAL_E_VAT_AIRTIME',
            'VAT Receivable - Communication Airtime',
            'VAT_RECEIVABLE', 14,
            false, true,
            '{"isComputed": true, "vatCategory": "airtime"}'::jsonb,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (category_id, code) DO NOTHING;

        -- Insert VAT Receivable - Communication Internet
        INSERT INTO dynamic_activities (
            category_id, project_type, facility_type, module_type,
            code, name, activity_type, display_order,
            is_total_row, is_active, metadata,
            created_at, updated_at
        ) VALUES (
            v_category_id, 'Malaria', 'hospital', 'execution',
            'MAL_EXEC_HOSPITAL_E_VAT_INTERNET',
            'VAT Receivable - Communication Internet',
            'VAT_RECEIVABLE', 15,
            false, true,
            '{"isComputed": true, "vatCategory": "internet"}'::jsonb,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (category_id, code) DO NOTHING;

        -- Insert VAT Receivable - Infrastructure Support
        INSERT INTO dynamic_activities (
            category_id, project_type, facility_type, module_type,
            code, name, activity_type, display_order,
            is_total_row, is_active, metadata,
            created_at, updated_at
        ) VALUES (
            v_category_id, 'Malaria', 'hospital', 'execution',
            'MAL_EXEC_HOSPITAL_E_VAT_INFRASTRUCTURE',
            'VAT Receivable - Infrastructure Support',
            'VAT_RECEIVABLE', 16,
            false, true,
            '{"isComputed": true, "vatCategory": "infrastructure"}'::jsonb,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (category_id, code) DO NOTHING;

        -- Insert VAT Receivable - Office Supplies
        INSERT INTO dynamic_activities (
            category_id, project_type, facility_type, module_type,
            code, name, activity_type, display_order,
            is_total_row, is_active, metadata,
            created_at, updated_at
        ) VALUES (
            v_category_id, 'Malaria', 'hospital', 'execution',
            'MAL_EXEC_HOSPITAL_E_VAT_SUPPLIES',
            'VAT Receivable - Office Supplies',
            'VAT_RECEIVABLE', 17,
            false, true,
            '{"isComputed": true, "vatCategory": "office_supplies"}'::jsonb,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (category_id, code) DO NOTHING;

        -- Update the total row display order
        UPDATE dynamic_activities
        SET display_order = 18
        WHERE category_id = v_category_id
        AND name = 'E. Financial Liabilities'
        AND is_total_row = true;
    END IF;
END $$;

-- Step 4: Add VAT receivable line items for Malaria Health Center
DO $$
DECLARE
    v_category_id INTEGER;
BEGIN
    -- Get the Section E category ID for Malaria Health Center
    SELECT id INTO v_category_id
    FROM schema_activity_categories
    WHERE code = 'MAL_EXEC_HEALTH_CENTER_E'
    AND module_type = 'execution';

    IF v_category_id IS NOT NULL THEN
        -- Insert VAT Receivable - Communication Airtime
        INSERT INTO dynamic_activities (
            category_id, project_type, facility_type, module_type,
            code, name, activity_type, display_order,
            is_total_row, is_active, metadata,
            created_at, updated_at
        ) VALUES (
            v_category_id, 'Malaria', 'health_center', 'execution',
            'MAL_EXEC_HEALTH_CENTER_E_VAT_AIRTIME',
            'VAT Receivable - Communication Airtime',
            'VAT_RECEIVABLE', 14,
            false, true,
            '{"isComputed": true, "vatCategory": "airtime"}'::jsonb,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (category_id, code) DO NOTHING;

        -- Insert VAT Receivable - Communication Internet
        INSERT INTO dynamic_activities (
            category_id, project_type, facility_type, module_type,
            code, name, activity_type, display_order,
            is_total_row, is_active, metadata,
            created_at, updated_at
        ) VALUES (
            v_category_id, 'Malaria', 'health_center', 'execution',
            'MAL_EXEC_HEALTH_CENTER_E_VAT_INTERNET',
            'VAT Receivable - Communication Internet',
            'VAT_RECEIVABLE', 15,
            false, true,
            '{"isComputed": true, "vatCategory": "internet"}'::jsonb,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (category_id, code) DO NOTHING;

        -- Insert VAT Receivable - Infrastructure Support
        INSERT INTO dynamic_activities (
            category_id, project_type, facility_type, module_type,
            code, name, activity_type, display_order,
            is_total_row, is_active, metadata,
            created_at, updated_at
        ) VALUES (
            v_category_id, 'Malaria', 'health_center', 'execution',
            'MAL_EXEC_HEALTH_CENTER_E_VAT_INFRASTRUCTURE',
            'VAT Receivable - Infrastructure Support',
            'VAT_RECEIVABLE', 16,
            false, true,
            '{"isComputed": true, "vatCategory": "infrastructure"}'::jsonb,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (category_id, code) DO NOTHING;

        -- Insert VAT Receivable - Office Supplies
        INSERT INTO dynamic_activities (
            category_id, project_type, facility_type, module_type,
            code, name, activity_type, display_order,
            is_total_row, is_active, metadata,
            created_at, updated_at
        ) VALUES (
            v_category_id, 'Malaria', 'health_center', 'execution',
            'MAL_EXEC_HEALTH_CENTER_E_VAT_SUPPLIES',
            'VAT Receivable - Office Supplies',
            'VAT_RECEIVABLE', 17,
            false, true,
            '{"isComputed": true, "vatCategory": "office_supplies"}'::jsonb,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (category_id, code) DO NOTHING;

        -- Update the total row display order
        UPDATE dynamic_activities
        SET display_order = 18
        WHERE category_id = v_category_id
        AND name = 'E. Financial Liabilities'
        AND is_total_row = true;
    END IF;
END $$;

-- Step 5: Add VAT receivable line items for TB Hospital
DO $$
DECLARE
    v_category_id INTEGER;
BEGIN
    -- Get the Section E category ID for TB Hospital
    SELECT id INTO v_category_id
    FROM schema_activity_categories
    WHERE code = 'TB_EXEC_HOSPITAL_E'
    AND module_type = 'execution';

    IF v_category_id IS NOT NULL THEN
        -- Insert VAT Receivable - Communication Airtime
        INSERT INTO dynamic_activities (
            category_id, project_type, facility_type, module_type,
            code, name, activity_type, display_order,
            is_total_row, is_active, metadata,
            created_at, updated_at
        ) VALUES (
            v_category_id, 'TB', 'hospital', 'execution',
            'TB_EXEC_HOSPITAL_E_VAT_AIRTIME',
            'VAT Receivable - Communication Airtime',
            'VAT_RECEIVABLE', 14,
            false, true,
            '{"isComputed": true, "vatCategory": "airtime"}'::jsonb,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (category_id, code) DO NOTHING;

        -- Insert VAT Receivable - Communication Internet
        INSERT INTO dynamic_activities (
            category_id, project_type, facility_type, module_type,
            code, name, activity_type, display_order,
            is_total_row, is_active, metadata,
            created_at, updated_at
        ) VALUES (
            v_category_id, 'TB', 'hospital', 'execution',
            'TB_EXEC_HOSPITAL_E_VAT_INTERNET',
            'VAT Receivable - Communication Internet',
            'VAT_RECEIVABLE', 15,
            false, true,
            '{"isComputed": true, "vatCategory": "internet"}'::jsonb,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (category_id, code) DO NOTHING;

        -- Insert VAT Receivable - Infrastructure Support
        INSERT INTO dynamic_activities (
            category_id, project_type, facility_type, module_type,
            code, name, activity_type, display_order,
            is_total_row, is_active, metadata,
            created_at, updated_at
        ) VALUES (
            v_category_id, 'TB', 'hospital', 'execution',
            'TB_EXEC_HOSPITAL_E_VAT_INFRASTRUCTURE',
            'VAT Receivable - Infrastructure Support',
            'VAT_RECEIVABLE', 16,
            false, true,
            '{"isComputed": true, "vatCategory": "infrastructure"}'::jsonb,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (category_id, code) DO NOTHING;

        -- Insert VAT Receivable - Office Supplies
        INSERT INTO dynamic_activities (
            category_id, project_type, facility_type, module_type,
            code, name, activity_type, display_order,
            is_total_row, is_active, metadata,
            created_at, updated_at
        ) VALUES (
            v_category_id, 'TB', 'hospital', 'execution',
            'TB_EXEC_HOSPITAL_E_VAT_SUPPLIES',
            'VAT Receivable - Office Supplies',
            'VAT_RECEIVABLE', 17,
            false, true,
            '{"isComputed": true, "vatCategory": "office_supplies"}'::jsonb,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (category_id, code) DO NOTHING;

        -- Update the total row display order
        UPDATE dynamic_activities
        SET display_order = 18
        WHERE category_id = v_category_id
        AND name = 'E. Financial Liabilities'
        AND is_total_row = true;
    END IF;
END $$;

-- Step 6: Add VAT receivable line items for TB Health Center
DO $$
DECLARE
    v_category_id INTEGER;
BEGIN
    -- Get the Section E category ID for TB Health Center
    SELECT id INTO v_category_id
    FROM schema_activity_categories
    WHERE code = 'TB_EXEC_HEALTH_CENTER_E'
    AND module_type = 'execution';

    IF v_category_id IS NOT NULL THEN
        -- Insert VAT Receivable - Communication Airtime
        INSERT INTO dynamic_activities (
            category_id, project_type, facility_type, module_type,
            code, name, activity_type, display_order,
            is_total_row, is_active, metadata,
            created_at, updated_at
        ) VALUES (
            v_category_id, 'TB', 'health_center', 'execution',
            'TB_EXEC_HEALTH_CENTER_E_VAT_AIRTIME',
            'VAT Receivable - Communication Airtime',
            'VAT_RECEIVABLE', 14,
            false, true,
            '{"isComputed": true, "vatCategory": "airtime"}'::jsonb,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (category_id, code) DO NOTHING;

        -- Insert VAT Receivable - Communication Internet
        INSERT INTO dynamic_activities (
            category_id, project_type, facility_type, module_type,
            code, name, activity_type, display_order,
            is_total_row, is_active, metadata,
            created_at, updated_at
        ) VALUES (
            v_category_id, 'TB', 'health_center', 'execution',
            'TB_EXEC_HEALTH_CENTER_E_VAT_INTERNET',
            'VAT Receivable - Communication Internet',
            'VAT_RECEIVABLE', 15,
            false, true,
            '{"isComputed": true, "vatCategory": "internet"}'::jsonb,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (category_id, code) DO NOTHING;

        -- Insert VAT Receivable - Infrastructure Support
        INSERT INTO dynamic_activities (
            category_id, project_type, facility_type, module_type,
            code, name, activity_type, display_order,
            is_total_row, is_active, metadata,
            created_at, updated_at
        ) VALUES (
            v_category_id, 'TB', 'health_center', 'execution',
            'TB_EXEC_HEALTH_CENTER_E_VAT_INFRASTRUCTURE',
            'VAT Receivable - Infrastructure Support',
            'VAT_RECEIVABLE', 16,
            false, true,
            '{"isComputed": true, "vatCategory": "infrastructure"}'::jsonb,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (category_id, code) DO NOTHING;

        -- Insert VAT Receivable - Office Supplies
        INSERT INTO dynamic_activities (
            category_id, project_type, facility_type, module_type,
            code, name, activity_type, display_order,
            is_total_row, is_active, metadata,
            created_at, updated_at
        ) VALUES (
            v_category_id, 'TB', 'health_center', 'execution',
            'TB_EXEC_HEALTH_CENTER_E_VAT_SUPPLIES',
            'VAT Receivable - Office Supplies',
            'VAT_RECEIVABLE', 17,
            false, true,
            '{"isComputed": true, "vatCategory": "office_supplies"}'::jsonb,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) ON CONFLICT (category_id, code) DO NOTHING;

        -- Update the total row display order
        UPDATE dynamic_activities
        SET display_order = 18
        WHERE category_id = v_category_id
        AND name = 'E. Financial Liabilities'
        AND is_total_row = true;
    END IF;
END $$;

-- Step 7: Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS "idx_dynamic_activities_vat_receivable" 
ON "dynamic_activities" ("activity_type") 
WHERE activity_type = 'VAT_RECEIVABLE';

CREATE INDEX IF NOT EXISTS "idx_dynamic_activities_metadata_vat_category" 
ON "dynamic_activities" USING gin (metadata) 
WHERE metadata ? 'vatCategory';
