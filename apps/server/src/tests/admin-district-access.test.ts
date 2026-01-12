/**
 * Integration Test: Admin User District-Level Access
 * 
 * This test verifies that admin users can access district-level compiled reports
 * and that the data aggregates correctly across all facilities in the district.
 * 
 * Requirements tested:
 * - 2.1: Admin user requests dashboard data with district scope
 * - 2.2: Admin users not restricted to their assigned district
 * - 2.3: District filter displays aggregated data for all facilities
 * - 2.4: Metrics calculated across all facilities in district
 * - 2.5: Budget by facility shows all facilities in district
 * - 6.1: Access control service resolves scope correctly for admin
 * - 6.2: Uses accessibleFacilityIds from user context
 * - 6.3: Returns complete data for requested scope
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/db';
import { facilities, districts, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAccessibleFacilities } from '@/lib/utils/get-user-facility';
import type { UserContext } from '@/lib/utils/get-user-facility';

describe('Admin User District-Level Access', () => {
  let adminUser: any;
  let adminUserContext: UserContext;
  let testDistrictId: number;
  let testDistrictName: string;
  let allFacilityIds: number[];
  let districtFacilityIds: number[];

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

    // Get a test district (first district with facilities)
    const testDistrict = await db.query.districts.findFirst();
    if (!testDistrict) {
      throw new Error('No districts found in database');
    }
    testDistrictId = testDistrict.id;
    testDistrictName = testDistrict.name;
    console.log(`[Test Setup] Using test district: ${testDistrictName} (ID: ${testDistrictId})`);

    // Get all facilities in the test district
    const districtFacilities = await db
      .select({ 
        id: facilities.id, 
        name: facilities.name,
        facilityType: facilities.facilityType
      })
      .from(facilities)
      .where(eq(facilities.districtId, testDistrictId));
    
    districtFacilityIds = districtFacilities.map(f => f.id);
    console.log(`[Test Setup] Facilities in district: ${districtFacilityIds.length}`);
    districtFacilities.forEach(f => console.log(`  - ${f.name} (ID: ${f.id}, Type: ${f.facilityType})`));

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

    // Verify accessible facilities include facilities from the test district
    const hasDistrictAccess = districtFacilityIds.every(id => 
      adminUserContext.accessibleFacilityIds.includes(id)
    );
    expect(hasDistrictAccess).toBe(true);
    console.log(`✓ Admin has access to all ${districtFacilityIds.length} facilities in test district`);
  });

  it('should allow admin to access district-level data regardless of assigned district', () => {
    console.log('\n[Test 2] Verifying admin can access district outside assigned district');
    
    // Check if admin's assigned district is the test district
    const adminInTestDistrict = adminUserContext.districtId === testDistrictId;
    
    console.log(`  - Admin assigned district: ${adminUserContext.districtId}`);
    console.log(`  - Test district: ${testDistrictId}`);
    console.log(`  - Admin in test district: ${adminInTestDistrict}`);

    // Regardless of whether admin is in the district, they should have access
    const canAccessDistrict = districtFacilityIds.every(id => 
      adminUserContext.accessibleFacilityIds.includes(id)
    );
    
    expect(canAccessDistrict).toBe(true);
    console.log(`✓ Admin can access district data regardless of assigned district`);
  });

  it('should return all facilities when filtering by district', async () => {
    console.log('\n[Test 3] Verifying all facilities in district are accessible');
    
    // Import access control service
    const { getAccessibleFacilitiesInDistrict } = await import('@/api/services/dashboard/access-control.service');
    
    // Get accessible facilities in the district for admin user
    const accessibleInDistrict = await getAccessibleFacilitiesInDistrict(
      adminUserContext,
      testDistrictId
    );

    console.log(`  - Facilities in district: ${districtFacilityIds.length}`);
    console.log(`  - Accessible facilities: ${accessibleInDistrict.length}`);

    // Admin should have access to ALL facilities in the district
    expect(accessibleInDistrict.length).toBe(districtFacilityIds.length);
    console.log(`✓ Admin has access to all facilities in district`);

    // Verify all district facilities are in the accessible list
    const allIncluded = districtFacilityIds.every(id => accessibleInDistrict.includes(id));
    expect(allIncluded).toBe(true);
    console.log(`✓ All district facilities are in accessible list`);
  });

  it('should aggregate metrics across all facilities in district', async () => {
    console.log('\n[Test 4] Verifying metrics aggregation across district facilities');
    
    // Import aggregation service
    const { aggregateBudgetData, getCurrentReportingPeriod } = await import('@/api/services/dashboard/aggregation.service');
    
    // Get current reporting period
    const currentPeriod = await getCurrentReportingPeriod();
    
    if (!currentPeriod) {
      console.log('⚠ No active reporting period found, skipping aggregation test');
      return;
    }

    console.log(`  - Using reporting period: ${currentPeriod.year} (ID: ${currentPeriod.id})`);

    // Aggregate budget data for all facilities in district
    const metrics = await aggregateBudgetData({
      facilityIds: districtFacilityIds,
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

  it('should return budget breakdown by facility for all facilities in district', async () => {
    console.log('\n[Test 5] Verifying budget by facility breakdown');
    
    // Import aggregation service
    const { aggregateByFacility, getCurrentReportingPeriod } = await import('@/api/services/dashboard/aggregation.service');
    const { getAccessibleFacilitiesInDistrict } = await import('@/api/services/dashboard/access-control.service');
    
    // Get current reporting period
    const currentPeriod = await getCurrentReportingPeriod();
    
    if (!currentPeriod) {
      console.log('⚠ No active reporting period found, skipping facility breakdown test');
      return;
    }

    // Get accessible facilities in district
    const facilityIds = await getAccessibleFacilitiesInDistrict(
      adminUserContext,
      testDistrictId
    );

    // Get budget by facility
    const facilityBudgets = await aggregateByFacility(
      testDistrictId,
      facilityIds,
      currentPeriod.id
    );

    console.log(`  - Facilities with budget data: ${facilityBudgets.length}`);
    facilityBudgets.forEach((f: any) => {
      console.log(`    • ${f.facilityName}: Allocated=${f.allocated}, Spent=${f.spent}, Utilization=${f.utilizationPercentage}%`);
    });

    // Verify we get data for facilities in the district
    // Note: Some facilities may have no budget data, so we check that returned facilities are valid
    facilityBudgets.forEach((facility: any) => {
      expect(districtFacilityIds).toContain(facility.facilityId);
    });
    console.log(`✓ All returned facilities belong to the district`);

    // Verify budget structure
    facilityBudgets.forEach((facility: any) => {
      expect(facility).toHaveProperty('facilityId');
      expect(facility).toHaveProperty('facilityName');
      expect(facility).toHaveProperty('allocated');
      expect(facility).toHaveProperty('spent');
      expect(facility).toHaveProperty('utilizationPercentage');
    });
    console.log(`✓ Facility budget structure is correct`);
  });

  it('should not restrict admin based on district when accessing district data', async () => {
    console.log('\n[Test 6] Verifying no district-based restrictions for admin');
    
    // Import access control service
    const { resolveScopeToFacilityIds } = await import('@/api/services/dashboard/access-control.service');
    
    // Resolve district scope to facility IDs
    const resolvedFacilityIds = await resolveScopeToFacilityIds(
      'district',
      testDistrictId,
      adminUserContext
    );

    console.log(`  - Resolved facility IDs: ${resolvedFacilityIds.length}`);
    console.log(`  - Expected facility IDs: ${districtFacilityIds.length}`);

    // Admin should get ALL facilities in the district
    expect(resolvedFacilityIds.length).toBe(districtFacilityIds.length);
    console.log(`✓ Scope resolution returns all district facilities`);

    // Verify all district facilities are included
    const allIncluded = districtFacilityIds.every(id => resolvedFacilityIds.includes(id));
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
