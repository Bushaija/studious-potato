/**
 * Dashboard Services
 * 
 * Central export point for all dashboard-related service functions
 */

// Budget calculation services
export {
  calculateAllocatedBudget,
  calculateSpentBudget,
  calculateUtilization,
  calculateRemaining,
  calculateBudgetMetrics,
} from './budget-calculations.service';

// Access control services
export {
  getAccessibleFacilitiesInProvince,
  getAccessibleFacilitiesInDistrict,
  getAccessibleFacilitiesForFacility,
  filterAccessibleFacilities,
  isAdminUser,
  validateFacilityAccess,
  validateDistrictAccess,
  validateProvinceAccess,
} from './access-control.service';

// Aggregation services
export {
  getCurrentReportingPeriod,
  fetchPlanningEntries,
  fetchExecutionEntries,
  aggregateBudgetData,
  aggregateByDistrict,
  aggregateByFacility,
  aggregateByProgram,
} from './aggregation.service';

// Unified dashboard service
export {
  DashboardService,
  type DashboardFilters,
  type ComponentResult,
} from './unified-dashboard.service';

// Role-based scope service
export {
  applyRoleBasedScope,
} from './role-scope.service';
