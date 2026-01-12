-- Migration: Add indexes for multi-scope execution reporting
-- Date: 2025-10-25
-- Description: Add performance indexes for district provinceId, facility parentFacilityId, 
--              facilityType, and composite index for district-type queries to support 
--              provincial and country scope reporting

-- Add index on districts.provinceId for provincial scope queries
-- This enables efficient filtering of districts by province
CREATE INDEX IF NOT EXISTS idx_districts_province_id 
  ON districts(province_id);

-- Add index on facilities.parentFacilityId for hierarchical facility queries
-- This enables efficient lookup of child health centers for a parent hospital
CREATE INDEX IF NOT EXISTS idx_facilities_parent_facility_id 
  ON facilities(parent_facility_id);

-- Add index on facilities.facilityType for facility type filtering
-- This enables efficient filtering by hospital vs health_center
CREATE INDEX IF NOT EXISTS idx_facilities_facility_type 
  ON facilities(facility_type);

-- Add composite index on facilities(districtId, facilityType) for provincial scope queries
-- This enables efficient filtering of facilities by district and type in a single lookup
-- Note: This index may already exist from schema definition (idx_facilities_district_type)
-- Using IF NOT EXISTS to avoid conflicts
CREATE INDEX IF NOT EXISTS idx_facilities_district_facility_type 
  ON facilities(district_id, facility_type);

-- Add comments for documentation
COMMENT ON INDEX idx_districts_province_id IS 'Index for filtering districts by province (provincial scope queries)';
COMMENT ON INDEX idx_facilities_parent_facility_id IS 'Index for finding child facilities of a parent hospital';
COMMENT ON INDEX idx_facilities_facility_type IS 'Index for filtering facilities by type (hospital/health_center)';
COMMENT ON INDEX idx_facilities_district_facility_type IS 'Composite index for district-type queries in provincial scope';
