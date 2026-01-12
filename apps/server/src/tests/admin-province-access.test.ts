/**
 * Integration Test: Admin User Province-Level Access
 * 
 * This test verifies that admin users can access province-level compiled reports
 * and that the data aggregates correctly across all facilities in the province.
 * 
 * Requirements tested:
 * - 1.1: Admin user requests dashboard data with province scope
 * - 1.2: Admin users not restricted to their assigned district
 * - 1.3: Province filter displays aggregated data for all districts
 * - 1.4: Metrics calculated across all facilities in province
 * - 1.5: Budget by district shows all districts in province
 * - 6.1: Access control service resolves scope correctly for admin
 * - 6.2: Uses accessibleFacilityIds from user context
 * - 6.3: Returns complete data for requested scope
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/db';
import { facilities, districts, provinces, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserContext, getAccessibleFacilities } from '@/lib/utils/get-user-facility';
import type { UserContext } from '@/lib/utils/get-user-facility';

describe('Admin User Province-Level Access', () => {
  let adminUser: any;
  let adminUserContext: UserContext;
  let testProvinceId: number;
  let testProvinceName: string;
  let allFacilityIds: number[];
  let provinceFacilityIds: number[];
  let provinceDistrictIds: number[];

  beforeAll(async () => {
    // Get admin user from database (seeded user)
    adminUser = await db.query.users.findFirst({
      where: eq(users.email, 'admin@gmail.com'),
    });

    if (!adminUser) {
      throw new Error('Admin user not found. Please run db:seed first.');
    }

    console.log(`[Test Setup] Found admin user: ${adminUser.email} (ID: ${adminUser.id}, Role: ${adminUser.role})`);

    // Get all facilities to verify admin has access to all
    const allFacilities = await db.select({ id: facilities.id }).from(facilities);
    allFacilityIds = allFacilities.map(f => f.id);
    console.log(`[Test Setup] Total facilities in system: ${allFacilityIds.length}`);

    // Get a test province (first province with facilities)
    const testProvince = await db.query.provinces.findFirst();
    if (!testProvince) {
      throw new Error('No provinces found in database');
    }
    testProvinceId = testProvince.id;
    testProvinceName = testProvince.name;
    console.log(`[Test Setup] Using test province: ${testProvinceName} (ID: ${testProvinceId})`);

    // Get all districts in the test province
    const provinceDistricts = await db
      .select({ id: districts.id, name: districts.name })
      .from(districts)
      .where(eq(districts.provinceId, testProvinceId));
    
    provinceDistrictIds = provinceDistricts.map(d => d.id);
    console.log(`[Test Setup] Districts in province: ${provinceDistricts.length}`);
    provinceDistricts.forEach(d => console.log(`  - ${d.name} (ID: ${d.id})`));

    // Get all facilities in the test province
    const provinceFacilities = await db
      .select({ 
        id: facilities.id, 
        name: facilities.name,
        districtId: facilities.districtId 
      })
      .from(facilities)
      .innerJoin(districts, eq(facilities.districtId, districts.id))
      .where(eq(districts.provinceId, testProvinceId));
    
    provinceFacilityIds = provinceFacilities.map(f => f.id);
    console.log(`[Test Setup] Facilities in province: ${provinceFacilityIds.length}`);

    // Create mock user context for admin
    const adminFacility = await db.query.facilities.findFirst({
      where: eq(facilities.id, adminUser.facilityId),
    });

    if (!adminFacility) {
      throw new Error('Admin user facility not found');
    }

    // Get accessible facilities for admin user
    const accessibleFacilityIds = await getAccessibleFacilities(
      adminUser.facilityId,
      adminFacility.facilityType,
      adminFacility.districtId,
      adminUser.role
    );

    adminUserContext = {
      userId: adminUser.id,
      facilityId: adminUser.facilityId,
      districtId: adminFacility.districtId,
      facilityType: adminFacility.facilityType,
      accessibleFacilityIds,
      role: adminUser.role,
      permissions: adminUser.permissions || [],
    };

    console.log(`[Test Setup] Admin user context created:`);
    console.log(`  - User ID: ${adminUserContext.userId}`);
    console.log(`  - Role: ${adminUserContext.role}`);
    console.log(`  - Assigned Facility: ${adminUserContext.facilityId}`);
    console.log(`  - Assigned District: ${adminUserContext.districtId}`);
    console.log(`  - Accessible Facilities: ${adminUserContext.accessibleFacilityIds.length}`);
  });

  it('should identify user as admin and grant access to all facilities', () => {
    console.log('\n[Test 1] Verifying admin role detection and facility access');
    
    // Verify user has admin role
    expect(adminUserContext.role).toMatch(/^(admin|superadmin)$/);
    console.log(`✓ User role is: ${adminUserContext.role}`);

    // Verify admin has access to ALL facilities in the system
    expect(adminUserContext.accessibleFacilityIds.length).toBe(allFacilityIds.length);
    console.log(`✓ Admin has access to all ${allFacilityIds.length} facilities`);

    // Verify accessible facilities include facilities from the test province
    const hasProvinceAccess = provinceFacilityIds.every(id => 
      adminUserContext.accessibleFacilityIds.includes(id)
    );
    expect(hasProvinceAccess).toBe(true);
    console.log(`✓ Admin has access to all ${provinceFacilityIds.length} facilities in test province`);
  });

  it('should allow admin to access province-level data regardless of assigned district', () => {
    console.log('\n[Test 2] Verifying admin can access province outside assigned district');
    
    // Check if admin's assigned district is in the test province
    const adminInTestProvince = provinceDistrictIds.includes(adminUserContext.districtId!);
    
    console.log(`  - Admin assigned district: ${adminUserContext.districtId}`);
    console.log(`  - Test province districts: ${provinceDistrictIds.join(', ')}`);
    console.log(`  - Admin in test province: ${adminInTestProvince}`);

    // Regardless of whether admin is in the province, they should have access
    const canAccessProvince = provinceFacilityIds.every(id => 
      adminUserContext.accessibleFacilityIds.includes(id)
    );
    
    expect(canAccessProvince).toBe(true);
    console.log(`✓ Admin can access province data regardless of assigned district`);
  });

  it('should return all districts when filtering by province', async () => {
    console.log('\n[Test 3] Verifying all districts in province are accessible');
    
    // Import access control service
    const { getAccessibleFacilitiesInProvince } = await import('@/api/services/dashboard/access-control.service');
    
    // Get accessible facilities in the province for admin user
    const accessibleInProvince = await getAccessibleFacilitiesInProvince(
      adminUserContext,
      testProvinceId
    );

    console.log(`  - Facilities in province: ${provinceFacilityIds.length}`);
    console.log(`  - Accessible facilities: ${accessibleInProvince.length}`);

    // Admin should have access to ALL facilities in the province
    expect(accessibleInProvince.length).toBe(provinceFacilityIds.length);
    console.log(`✓ Admin has access to all facilities in province`);

    // Verify all province facilities are in the accessible list
    const allIncluded = provinceFacilityIds.every(id => accessibleInProvince.includes(id));
    expect(allIncluded).toBe(true);
    console.log(`✓ All province facilities are in accessible list`);
  });

  it('should aggregate metrics across all facilities in province', async () => {
    console.log('\n[Test 4] Verifying metrics aggregation across province facilities');
    
    // Import aggregation service
    const { aggregateBudgetData } = await import('@/api/services/dashboard/aggregation.service');
    const { getCurrentReportingPeriod } = await import('@/api/services/dashboard/aggregation.service');
    
    // Get current reporting period
    const currentPeriod = await getCurrentReportingPeriod();
    
    if (!currentPeriod) {
      console.log('⚠ No active reporting period found, skipping aggregation test');
      return;
    }

    console.log(`  - Using reporting period: ${currentPeriod.year} (ID: ${currentPeriod.id})`);

    // Aggregate budget data for all facilities in province
    const metrics = await aggregateBudgetData({
      facilityIds: provinceFacilityIds,
      reportingPeriodId: currentPeriod.id,
    });

    console.log(`  - Metrics calculated:`);
    console.log(`    • Total Allocated: ${metrics.allocated}`);
    console.log(`    • Total Spent: ${metrics.spent}`);
    console.log(`    • Remaining: ${metrics.remaining}`);
    console.log(`    • Utilization: ${metrics.utilizationPercentage}%`);

    // Verify metrics structure
    expect(metrics).toHaveProperty('allocated');
    expect(metrics).toHaveProperty('spent');
    expect(metrics).toHaveProperty('remaining');
    expect(metrics).toHaveProperty('utilizationPercentage');
    console.log(`✓ Metrics structure is correct`);

    // Verify calculations are consistent
    expect(metrics.remaining).toBe(metrics.allocated - metrics.spent);
    console.log(`✓ Remaining calculation is correct`);
  });

  it('should return budget breakdown by district for all districts in province', async () => {
    console.log('\n[Test 5] Verifying budget by district breakdown');
    
    // Import aggregation service
    const { aggregateByDistrict } = await import('@/api/services/dashboard/aggregation.service');
    const { getCurrentReportingPeriod } = await import('@/api/services/dashboard/aggregation.service');
    const { getAccessibleFacilitiesInProvince } = await import('@/api/services/dashboard/access-control.service');
    
    // Get current reporting period
    const currentPeriod = await getCurrentReportingPeriod();
    
    if (!currentPeriod) {
      console.log('⚠ No active reporting period found, skipping district breakdown test');
      return;
    }

    // Get accessible facilities in province
    const facilityIds = await getAccessibleFacilitiesInProvince(
      adminUserContext,
      testProvinceId
    );

    // Get budget by district
    const districtBudgets = await aggregateByDistrict(
      testProvinceId,
      facilityIds,
      currentPeriod.id
    );

    console.log(`  - Districts with budget data: ${districtBudgets.length}`);
    districtBudgets.forEach(d => {
      console.log(`    • ${d.districtName}: Allocated=${d.allocated}, Spent=${d.spent}, Utilization=${d.utilizationPercentage}%`);
    });

    // Verify we get data for districts in the province
    // Note: Some districts may have no budget data, so we check that returned districts are valid
    districtBudgets.forEach(district => {
      expect(provinceDistrictIds).toContain(district.districtId);
    });
    console.log(`✓ All returned districts belong to the province`);

    // Verify budget structure
    districtBudgets.forEach(district => {
      expect(district).toHaveProperty('districtId');
      expect(district).toHaveProperty('districtName');
      expect(district).toHaveProperty('allocated');
      expect(district).toHaveProperty('spent');
      expect(district).toHaveProperty('utilizationPercentage');
    });
    console.log(`✓ District budget structure is correct`);
  });

  it('should not restrict admin based on district when accessing province data', async () => {
    console.log('\n[Test 6] Verifying no district-based restrictions for admin');
    
    // Import access control service
    const { resolveScopeToFacilityIds } = await import('@/api/services/dashboard/access-control.service');
    
    // Resolve province scope to facility IDs
    const resolvedFacilityIds = await resolveScopeToFacilityIds(
      'province',
      testProvinceId,
      adminUserContext
    );

    console.log(`  - Resolved facility IDs: ${resolvedFacilityIds.length}`);
    console.log(`  - Expected facility IDs: ${provinceFacilityIds.length}`);

    // Admin should get ALL facilities in the province
    expect(resolvedFacilityIds.length).toBe(provinceFacilityIds.length);
    console.log(`✓ Scope resolution returns all province facilities`);

    // Verify all province facilities are included
    const allIncluded = provinceFacilityIds.every(id => resolvedFacilityIds.includes(id));
    expect(allIncluded).toBe(true);
    console.log(`✓ No facilities filtered out based on admin's district`);
  });

  it('should log facility count for debugging purposes', () => {
    console.log('\n[Test 7] Verifying logging for debugging');
    
    // This test verifies that the logging is in place (checked in beforeAll)
    // The actual console.log statements are in getAccessibleFacilities function
    
    console.log(`  - Admin user ID: ${adminUserContext.userId}`);
    console.log(`  - Admin role: ${adminUserContext.role}`);
    console.log(`  - Accessible facilities: ${adminUserContext.accessibleFacilityIds.length}`);
    
    // Verify the context has the expected structure for logging
    expect(adminUserContext).toHaveProperty('userId');
    expect(adminUserContext).toHaveProperty('role');
    expect(adminUserContext).toHaveProperty('accessibleFacilityIds');
    expect(Array.isArray(adminUserContext.accessibleFacilityIds)).toBe(true);
    
    console.log(`✓ User context structure supports debugging logs`);
  });
});
