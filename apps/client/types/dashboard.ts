/**
 * Unified Dashboard API Types
 * 
 * Type definitions for the unified dashboard endpoint that consolidates
 * multiple dashboard components into a single API call.
 */

// ============================================================================
// Filter Types
// ============================================================================

export type DashboardScope = 'country' | 'province' | 'district' | 'facility';

export interface DashboardFilters {
  scope?: DashboardScope;
  scopeId?: number;
  /**
   * Filter by project type (health program)
   * Valid values: "HIV", "Malaria", "TB"
   */
  projectType?: string;
  periodId?: number;
  quarter?: number;
}

// ============================================================================
// Component Result Types
// ============================================================================

export interface ComponentResult<T = any> {
  error?: boolean;
  message?: string;
  data?: T;
}

// ============================================================================
// Component Response Types
// ============================================================================

export interface MetricsData {
  totalAllocated: number;
  totalSpent: number;
  remaining: number;
  utilizationPercentage: number;
}

export interface ProgramDistributionItem {
  programId: number;
  programName: string;
  allocatedBudget: number;
  percentage: number;
}

export interface ProgramDistributionData {
  programs: ProgramDistributionItem[];
  total: number;
}

export interface DistrictBudgetItem {
  districtId: number;
  districtName: string;
  allocatedBudget: number;
  spentBudget: number;
  utilizationPercentage: number;
}

export interface BudgetByDistrictData {
  districts: DistrictBudgetItem[];
}

export interface FacilityBudgetItem {
  facilityId: number;
  facilityName: string;
  facilityType: string;
  allocatedBudget: number;
  spentBudget: number;
  utilizationPercentage: number;
}

export interface BudgetByFacilityData {
  facilities: FacilityBudgetItem[];
}

export interface ProvinceApprovalItem {
  districtId: number;
  districtName: string;
  allocatedBudget: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  totalCount: number;
  approvalRate: number;
}

export interface ProvinceApprovalsData {
  districts: ProvinceApprovalItem[];
}

export interface DistrictApprovalItem {
  facilityId: number;
  facilityName: string;
  projectId: number;
  projectName: string;
  projectCode: string;
  allocatedBudget: number;
  approvalStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
  approvedBy: string | null;
  approvedAt: string | null;
  quarter: number | null;
}

export interface DistrictApprovalsData {
  facilities: DistrictApprovalItem[];
}

export interface PendingPlanTask {
  projectId: number;
  projectName: string;
  projectCode: string;
  reportingPeriodId: number;
  reportingPeriodYear: number;
  deadline: string;
  status: string;
}

export interface PendingExecutionTask {
  projectId: number;
  projectName: string;
  projectCode: string;
  reportingPeriodId: number;
  reportingPeriodYear: number;
  quarter: number;
  deadline: string;
  status: string;
}

export interface UpcomingDeadline {
  reportingPeriodId: number;
  year: number;
  periodType: string;
  endDate: string;
  daysRemaining: number;
}

export interface TasksData {
  pendingPlans: PendingPlanTask[];
  pendingExecutions: PendingExecutionTask[];
  correctionsRequired: any[];
  upcomingDeadlines: UpcomingDeadline[];
}

// ============================================================================
// Component Names
// ============================================================================

export type DashboardComponent =
  | 'metrics'
  | 'programDistribution'
  | 'budgetByDistrict'
  | 'budgetByFacility'
  | 'provinceApprovals'
  | 'districtApprovals'
  | 'tasks';

// ============================================================================
// Unified Dashboard Response
// ============================================================================

export interface UnifiedDashboardResponse {
  metrics?: ComponentResult<MetricsData>;
  programDistribution?: ComponentResult<ProgramDistributionData>;
  budgetByDistrict?: ComponentResult<BudgetByDistrictData>;
  budgetByFacility?: ComponentResult<BudgetByFacilityData>;
  provinceApprovals?: ComponentResult<ProvinceApprovalsData>;
  districtApprovals?: ComponentResult<DistrictApprovalsData>;
  tasks?: ComponentResult<TasksData>;
}
