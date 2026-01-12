/**
 * Dashboard Access Control Utilities
 * 
 * Manages role-based access control for the Budget Monitoring Dashboard
 * based on user roles (Admin, Accountant, DAF, DG, Program Manager) and their facility assignments.
 */

import type { User, UserRole } from "@/types/user";

export interface DashboardAccessRights {
  // Tab visibility
  canViewProvinceTab: boolean;
  canViewDistrictTab: boolean;

  // Data scope
  canViewAllProvinces: boolean;
  canViewAllDistricts: boolean;
  allowedDistrictIds: number[];
  allowedProvinceIds: number[];
  userFacilityId?: number; // User's facility ID for facility-level users

  // Feature access
  canViewProvinceLevelCharts: boolean;
  canViewDistrictLevelCharts: boolean;
  canViewProvinceApprovalTable: boolean;
  canViewDistrictApprovalTable: boolean;
  canViewBudgetByDistrictChart: boolean;
  canViewBudgetByFacilityChart: boolean;

  // Filter permissions
  canFilterByAnyProvince: boolean;
  canFilterByAnyDistrict: boolean;
  canFilterByProgram: boolean;
  canFilterByQuarter: boolean;
}

export interface FacilityInfo {
  id: number;
  name: string;
  facilityType: string;
  districtId?: number;
  district?: {
    id: number;
    name: string;
    provinceId?: number;
  };
}

/**
 * Get dashboard access rights based on user role and facility
 */
export function getDashboardAccessRights(
  user: User | null | undefined,
  facility?: FacilityInfo
): DashboardAccessRights {
  // Default: no access
  if (!user) {
    return {
      canViewProvinceTab: false,
      canViewDistrictTab: false,
      canViewAllProvinces: false,
      canViewAllDistricts: false,
      allowedDistrictIds: [],
      allowedProvinceIds: [],
      userFacilityId: undefined,
      canViewProvinceLevelCharts: false,
      canViewDistrictLevelCharts: false,
      canViewProvinceApprovalTable: false,
      canViewDistrictApprovalTable: false,
      canViewBudgetByDistrictChart: false,
      canViewBudgetByFacilityChart: false,
      canFilterByAnyProvince: false,
      canFilterByAnyDistrict: false,
      canFilterByProgram: false,
      canFilterByQuarter: false,
    };
  }

  const role = user.role;

  // Admin & Superadmin: Full access to everything
  if (role === "admin" || role === "superadmin") {
    return {
      canViewProvinceTab: true,
      canViewDistrictTab: true,
      canViewAllProvinces: true,
      canViewAllDistricts: true,
      allowedDistrictIds: [], // Empty means all
      allowedProvinceIds: [], // Empty means all
      userFacilityId: facility?.id,
      canViewProvinceLevelCharts: true,
      canViewDistrictLevelCharts: true,
      canViewProvinceApprovalTable: true,
      canViewDistrictApprovalTable: true,
      canViewBudgetByDistrictChart: true,
      canViewBudgetByFacilityChart: true,
      canFilterByAnyProvince: true,
      canFilterByAnyDistrict: true,
      canFilterByProgram: true,
      canFilterByQuarter: true,
    };
  }

  // Accountant: Limited to their facility and its children
  if (role === "accountant") {
    const districtId = facility?.districtId || facility?.district?.id;
    const provinceId = facility?.district?.provinceId;

    return {
      canViewProvinceTab: false, // Hidden for accountants
      canViewDistrictTab: true,
      canViewAllProvinces: false,
      canViewAllDistricts: false,
      allowedDistrictIds: districtId ? [districtId] : [],
      allowedProvinceIds: provinceId ? [provinceId] : [],
      userFacilityId: facility?.id, // Use facility-level filtering
      canViewProvinceLevelCharts: false,
      canViewDistrictLevelCharts: true,
      canViewProvinceApprovalTable: false,
      canViewDistrictApprovalTable: true,
      canViewBudgetByDistrictChart: false, // Hidden for accountants
      canViewBudgetByFacilityChart: true,
      canFilterByAnyProvince: false,
      canFilterByAnyDistrict: false, // Can only view their own facility
      canFilterByProgram: true,
      canFilterByQuarter: true,
    };
  }

  // Program Manager: Limited to their facility and its children
  if (role === "program_manager") {
    const districtId = facility?.districtId || facility?.district?.id;
    const provinceId = facility?.district?.provinceId;

    return {
      canViewProvinceTab: false,
      canViewDistrictTab: true,
      canViewAllProvinces: false,
      canViewAllDistricts: false,
      allowedDistrictIds: districtId ? [districtId] : [],
      allowedProvinceIds: provinceId ? [provinceId] : [],
      userFacilityId: facility?.id, // Use facility-level filtering
      canViewProvinceLevelCharts: false,
      canViewDistrictLevelCharts: true,
      canViewProvinceApprovalTable: false,
      canViewDistrictApprovalTable: true,
      canViewBudgetByDistrictChart: false,
      canViewBudgetByFacilityChart: true,
      canFilterByAnyProvince: false,
      canFilterByAnyDistrict: false, // Can only view their own facility
      canFilterByProgram: true,
      canFilterByQuarter: true,
    };
  }

  // DAF (Directeur Administratif et Financier): Limited to their facility and its children
  if (role === "daf") {
    const districtId = facility?.districtId || facility?.district?.id;
    const provinceId = facility?.district?.provinceId;

    return {
      canViewProvinceTab: false,
      canViewDistrictTab: true,
      canViewAllProvinces: false,
      canViewAllDistricts: false,
      allowedDistrictIds: districtId ? [districtId] : [],
      allowedProvinceIds: provinceId ? [provinceId] : [],
      userFacilityId: facility?.id, // Use facility-level filtering
      canViewProvinceLevelCharts: false,
      canViewDistrictLevelCharts: true,
      canViewProvinceApprovalTable: false,
      canViewDistrictApprovalTable: true,
      canViewBudgetByDistrictChart: false,
      canViewBudgetByFacilityChart: true,
      canFilterByAnyProvince: false,
      canFilterByAnyDistrict: false, // Can only view their own facility
      canFilterByProgram: true,
      canFilterByQuarter: true,
    };
  }

  // DG (Directeur Général): Limited to their facility and its children
  if (role === "dg") {
    const districtId = facility?.districtId || facility?.district?.id;
    const provinceId = facility?.district?.provinceId;

    return {
      canViewProvinceTab: false,
      canViewDistrictTab: true,
      canViewAllProvinces: false,
      canViewAllDistricts: false,
      allowedDistrictIds: districtId ? [districtId] : [],
      allowedProvinceIds: provinceId ? [provinceId] : [],
      userFacilityId: facility?.id, // Use facility-level filtering
      canViewProvinceLevelCharts: false,
      canViewDistrictLevelCharts: true,
      canViewProvinceApprovalTable: false,
      canViewDistrictApprovalTable: true,
      canViewBudgetByDistrictChart: false,
      canViewBudgetByFacilityChart: true,
      canFilterByAnyProvince: false,
      canFilterByAnyDistrict: false, // Can only view their own facility
      canFilterByProgram: true,
      canFilterByQuarter: true,
    };
  }

  // Default: no access for unknown roles
  return {
    canViewProvinceTab: false,
    canViewDistrictTab: false,
    canViewAllProvinces: false,
    canViewAllDistricts: false,
    allowedDistrictIds: [],
    allowedProvinceIds: [],
    userFacilityId: undefined,
    canViewProvinceLevelCharts: false,
    canViewDistrictLevelCharts: false,
    canViewProvinceApprovalTable: false,
    canViewDistrictApprovalTable: false,
    canViewBudgetByDistrictChart: false,
    canViewBudgetByFacilityChart: false,
    canFilterByAnyProvince: false,
    canFilterByAnyDistrict: false,
    canFilterByProgram: false,
    canFilterByQuarter: false,
  };
}

/**
 * Check if user can access a specific province
 */
export function canAccessProvince(
  accessRights: DashboardAccessRights,
  provinceId: number
): boolean {
  if (accessRights.canViewAllProvinces) {
    return true;
  }

  if (accessRights.allowedProvinceIds.length === 0) {
    return false;
  }

  return accessRights.allowedProvinceIds.includes(provinceId);
}

/**
 * Check if user can access a specific district
 */
export function canAccessDistrict(
  accessRights: DashboardAccessRights,
  districtId: number
): boolean {
  if (accessRights.canViewAllDistricts) {
    return true;
  }

  if (accessRights.allowedDistrictIds.length === 0) {
    return false;
  }

  return accessRights.allowedDistrictIds.includes(districtId);
}

/**
 * Get default tab based on access rights
 */
export function getDefaultTab(
  accessRights: DashboardAccessRights
): "province" | "district" {
  if (accessRights.canViewProvinceTab) {
    return "province";
  }
  return "district";
}

/**
 * Get default district ID for district-level users (accountants, DAF, DG, program managers)
 */
export function getDefaultDistrictId(
  accessRights: DashboardAccessRights
): number | undefined {
  if (
    !accessRights.canViewAllDistricts &&
    accessRights.allowedDistrictIds.length > 0
  ) {
    return accessRights.allowedDistrictIds[0];
  }
  return undefined;
}

/**
 * Get default province ID for users with limited access
 */
export function getDefaultProvinceId(
  accessRights: DashboardAccessRights
): number | undefined {
  if (
    !accessRights.canViewAllProvinces &&
    accessRights.allowedProvinceIds.length > 0
  ) {
    return accessRights.allowedProvinceIds[0];
  }
  return undefined;
}

/**
 * Filter districts based on access rights
 */
export function filterAllowedDistricts<T extends { id: number }>(
  districts: T[],
  accessRights: DashboardAccessRights
): T[] {
  if (accessRights.canViewAllDistricts) {
    return districts;
  }

  if (accessRights.allowedDistrictIds.length === 0) {
    return [];
  }

  return districts.filter((district) =>
    accessRights.allowedDistrictIds.includes(district.id)
  );
}

/**
 * Filter provinces based on access rights
 */
export function filterAllowedProvinces<T extends { id: number }>(
  provinces: T[],
  accessRights: DashboardAccessRights
): T[] {
  if (accessRights.canViewAllProvinces) {
    return provinces;
  }

  if (accessRights.allowedProvinceIds.length === 0) {
    return [];
  }

  return provinces.filter((province) =>
    accessRights.allowedProvinceIds.includes(province.id)
  );
}
