/**
 * Facilities API Client Methods
 * 
 * This module exports all facility-related API client methods including
 * hierarchy-aware methods for the district-based role hierarchy system.
 * 
 * Requirements: 2.3, 6.1, 6.2, 7.4
 */

// Core facility fetchers
export { default as getFacilities } from "./get-facilities";
export { default as getFacilityById } from "./get-facility-by-id";
export { default as getFacilityByName } from "./get-facility-by-name";
export { default as getAllFacilities } from "./get-all-facilities";
export { default as getFacilitiesByDistrict } from "./get-facilities-by-district";

// Planning and execution facility fetchers
export { default as getPlanningFacilities } from "./get-planning-facilities";
export { default as getPlannedFacilities } from "./get-planned-facilities";
export { default as getExecutionFacilities } from "./get-execution-facilities";

// Hierarchy-aware facility fetchers (Requirements: 2.3, 7.4)
export { default as getAccessibleFacilities } from "./get-accessible-facilities";
export type { AccessibleFacility } from "./get-accessible-facilities";

export { default as getFacilityHierarchy } from "./get-facility-hierarchy";
export type { FacilityHierarchyData } from "./get-facility-hierarchy";
