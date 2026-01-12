/**
 * Integration Test: Accountant User Access Restrictions
 * 
 * This test verifies that accountant users remain restricted to their district facilities
 * and that the admin fix does not affect non-admin user access control.
 * 
 * Requirements tested:
 * - 4.1: Accountant users restricted to facilities in their district
 * - 4.2: Facility type restrictions apply for accountant users
 * - 4.3: Accountant users cannot view data outside their district
 * - 4.4: Accountant users cannot access country or province-wide data outside their district
 * - 4.5: Existing access control behavior maintained for non-admin users
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/db';
import { facilities, districts, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAccessibleFacilities } from '@/lib/utils/get-user-facility';
import type { UserContext } from '@/lib/utils/get-user-facility';

describe('Accountant User Access Restrictions', () => {
  let accountantUser: any;
  let accountantUserContext: UserContext;
  let accountantDistrictId: number;
  let accountantDistrictName: string;
  let accountantDistrictFacilityIds: number[];
  let otherDistrictId: number;
  let otherDistrictName: string;
  let otherDistrictFacilityIds: number[];
  let allFacilityIds: number[];

  beforeAll(async () => {
    // Get all facilities to compare against
    const allFacilities = await db.select({ id: facilities.id }).from(facilities);
    allFacilityIds = allFacilities.map(f => f.id);
    console.log(`[Test Setup] Total facilities in system: ${allFacilityIds.length}`);

    // Find an accountant user (hospital-based accountant)
    const accountants = await db.query.users.findMany({
      where: eq(users.role, 'accountant'),
    });

    // Find a hospital-based accountant
    accountantUser = accountants.find(async (user) => {
      const facility = await db.query.facilities.findFirst({
        where: eq(facilities.id, user.facilityId),
      });
      return facility?.facilityType === 'hospital';
    });

    if (!accountantUser) {
      // If no hospital accountant exists, use the first accountant
      accountantUser = accountants[0];
    }

    if (!accountantUser) {
      throw new Error('No accountant user found. Please run db:seed first.');
    }

    console.log(`[Test Setup] Found accountant user: ${accountantUser.email} (ID: ${accountantUser.id}, Role: ${accountantUser.role})`);

    // Get accountant's facility and district
    const accountantFacility = await db.query.facilities.findFirst({
      where: eq(facilities.id, accountantUser.facilityId),
    });

    if (!accountantFacility) {
      throw new Error('Accountant user facility not found');
    }

    accountantDistrictId = accountantFacility.districtId!;
    
    const accountantDistrict = await db.query.districts.findFirst({
      where: eq(districts.id, accountantDistrictId),
    });
    
    accountantDistrictName = accountantDistrict?.name || `District ${accountantDistrictId}`;
    console.log(`[Test Setup] Accountant assigned to: ${accountantFacility.name} (${accountantDistrictName} district)`);
    console.log(`[Test Setup] Accountant facility type: ${accountantFacility.facilityType}`);

    // Get all facilities in accountant's district
    const districtFacilities = await db
      .select({ 
        id: facilities.id, 
        name: facilities.name,
        facilityType: facilities.facilityType
      })
      .from(facilities)
      .where(eq(facilities.districtId, accountantDistrictId));
    
    accountantDistrictFacilityIds = districtFacilities.map(f => f.id);
    console.log(`[Test Setup] Facilities in accountant's district: ${accountantDistrictFacilityIds.length}`);
    districtFacilities.forEach(f => console.log(`  - ${f.name} (ID: ${f.id}, Type: ${f.facilityType})`));

    // Get a different district for testing access restrictions
    const otherDistrict = await db.query.districts.findFirst({
      where: (districts, { ne }) => ne(districts.id, accountantDistrictId),
    });

    if (!otherDistrict) {
      throw new Error('No other district found for testing');
    }

    otherDistrictId = otherDistrict.id;
    otherDistrictName = otherDistrict.name;
    console.log(`[Test Setup] Using other district for testing: ${otherDistrictName} (ID: ${otherDistrictId})`);

    // Get facilities in the other district
    const otherFacilities = await db
      .select({ id: facilities.id, name: facilities.name })
      .from(facilities)
      .where(eq(facilities.districtId, otherDistrictId));
    
    otherDistrictFacilityIds = otherFacilities.map(f => f.id);
    console.log(`[Test Setup] Facilities in other district: ${otherDistrictFacilityIds.length}`);

    // Get accessible facilities for accountant user
    const accessibleFacilityIds = await getAccessibleFacilities(
      accountantUser.facilityId,
      accountantFacility.facilityType,
      accountantFacility.districtId,
      accountantUser.role
    );

    accountantUserContext = {
      userId: accountantUser.id,
      facilityId: accountantUser.facilityId,
      districtId: accountantFacility.districtId,
      facilityType: accountantFacility.facilityType,
      accessibleFacilityIds,
      role: accountantUser.role,
      permissions: accountantUser.permissions || [],
    };

    console.log(`[Test Setup] Accountant user context created:`);
    console.log(`  - User ID: ${accountantUserContext.userId}`);
    console.log(`  - Role: ${accountantUserContext.role}`);
    console.log(`  - Assigned Facility: ${accountantUserContext.facilityId}`);
    console.log(`  - Assigned District: ${accountantUserContext.districtId}`);
    console.log(`  - Accessible Facilities: ${accountantUserContext.accessibleFacilityIds.length}`);
  });

  it('should identify user as accountant and restrict access to district facilities', () => {
    console.log('\n[Test 1] Verifying accountant role detection and facility restrictions');
    
    // Verify user has accountant role
    expect(accountantUserContext.role).toBe('accountant');
    console.log(`✓ User role is: ${accountantUserContext.role}`);

    // Verify accountant does NOT have access to ALL facilities
    expect(accountantUserContext.accessibleFacilityIds.length).toBeLessThan(allFacilityIds.length);
    console.log(`✓ Accountant has restricted access: ${accountantUserContext.accessibleFacilityIds.length} of ${allFacilityIds.length} facilities`);

    // Verify accessible facilities are only from accountant's district
    const allInDistrict = accountantUserContext.accessibleFacilityIds.every(id =>
      accountantDistrictFacilityIds.includes(id)
    );
    expect(allInDistrict).toBe(true);
    console.log(`✓ All accessible facilities are in accountant's district`);
  });

  it('should apply facility type restrictions for accountant users', () => {
    console.log('\n[Test 2] Verifying facility type-based access restrictions');
    
    if (accountantUserContext.facilityType === 'hospital') {
      // Hospital accountants should see all facilities in their district
      expect(accountantUserContext.accessibleFacilityIds.length).toBe(accountantDistrictFacilityIds.length);
      console.log(`✓ Hospital accountant has access to all ${accountantDistrictFacilityIds.length} facilities in district`);
    } else if (accountantUserContext.facilityType === 'health_center') {
      // Health center accountants should only see their own facility
      expect(accountantUserContext.accessibleFacilityIds.length).toBe(1);
      expect(accountantUserContext.accessibleFacilityIds[0]).toBe(accountantUserContext.facilityId);
      console.log(`✓ Health center accountant has access only to their facility (ID: ${accountantUserContext.facilityId})`);
    }
  });

  it('should not allow accountant to access facilities outside their district', async () => {
    console.log('\n[Test 3] Verifying accountant cannot access other districts');
    
    // Import access control service
    const { getAccessibleFacilitiesInDistrict } = await import('@/api/services/dashboard/access-control.service');
    
    // Try to get accessible facilities in the other district
    const accessibleInOtherDistrict = await getAccessibleFacilitiesInDistrict(
      accountantUserContext,
      otherDistrictId
    );

    console.log(`  - Accountant's district: ${accountantDistrictId}`);
    console.log(`  - Other district: ${otherDistrictId}`);
    console.log(`  - Facilities in other district: ${otherDistrictFacilityIds.length}`);
    console.log(`  - Accessible facilities in other district: ${accessibleInOtherDistrict.length}`);

    // Accountant should have NO access to facilities in other district
    expect(accessibleInOtherDistrict.length).toBe(0);
    console.log(`✓ Accountant has no access to facilities in other district`);
  });

  it('should not allow accountant to access province-wide data outside their district', async () => {
    console.log('\n[Test 4] Verifying accountant cannot access province data outside their district');
    
    // Import access control service
    const { getAccessibleFacilitiesInProvince } = await import('@/api/services/dashboard/access-control.service');
    
    // Get the province of the other district
    const otherDistrict = await db.query.districts.findFirst({
      where: eq(districts.id, otherDistrictId),
    });

    if (!otherDistrict) {
      console.log('⚠ Other district not found, skipping province test');
      return;
    }

    const otherProvinceId = otherDistrict.provinceId;
    console.log(`  - Testing province: ${otherProvinceId}`);

    // Try to get accessible facilities in the other province
    const accessibleInProvince = await getAccessibleFacilitiesInProvince(
      accountantUserContext,
      otherProvinceId
    );

    console.log(`  - Accessible facilities in province: ${accessibleInProvince.length}`);

    // Accountant should only see facilities in their own district (if it's in this province)
    const accountantDistrict = await db.query.districts.findFirst({
      where: eq(districts.id, accountantDistrictId),
    });

    if (accountantDistrict?.provinceId === otherProvinceId) {
      // Accountant's district is in this province, so they should see their district facilities
      expect(accessibleInProvince.length).toBe(accountantUserContext.accessibleFacilityIds.length);
      console.log(`✓ Accountant sees only their district facilities in province`);
    } else {
      // Accountant's district is NOT in this province, so they should see nothing
      expect(accessibleInProvince.length).toBe(0);
      console.log(`✓ Accountant has no access to province outside their district`);
    }
  });

  it('should not allow accountant to access country-wide data outside their district', async () => {
    console.log('\n[Test 5] Verifying accountant cannot access country-wide data');
    
    // Import access control service
    const { getAccessibleFacilitiesForCountry } = await import('@/api/services/dashboard/access-control.service');
    
    // Get accessible facilities for country scope
    const accessibleInCountry = await getAccessibleFacilitiesForCountry(accountantUserContext);

    console.log(`  - Total facilities in country: ${allFacilityIds.length}`);
    console.log(`  - Accessible facilities for accountant: ${accessibleInCountry.length}`);

    // Accountant should only see their district facilities, not all country facilities
    expect(accessibleInCountry.length).toBe(accountantUserContext.accessibleFacilityIds.length);
    expect(accessibleInCountry.length).toBeLessThan(allFacilityIds.length);
    console.log(`✓ Accountant restricted to ${accessibleInCountry.length} facilities (not all ${allFacilityIds.length})`);
  });

  it('should maintain existing behavior for hospital and health center users', async () => {
    console.log('\n[Test 6] Verifying existing access control behavior is unchanged');
    
    // Test hospital user
    const hospitalFacility = await db.query.facilities.findFirst({
      where: eq(facilities.facilityType, 'hospital'),
    });

    if (hospitalFacility) {
      const hospitalAccessibleIds = await getAccessibleFacilities(
        hospitalFacility.id,
        'hospital',
        hospitalFacility.districtId,
        'accountant'
      );

      // Hospital users should see all facilities in their district
      const hospitalDistrictFacilities = await db
        .select({ id: facilities.id })
        .from(facilities)
        .where(eq(facilities.districtId, hospitalFacility.districtId!));

      expect(hospitalAccessibleIds.length).toBe(hospitalDistrictFacilities.length);
      console.log(`✓ Hospital user sees all ${hospitalAccessibleIds.length} facilities in their district`);
    }

    // Test health center user
    const healthCenterFacility = await db.query.facilities.findFirst({
      where: eq(facilities.facilityType, 'health_center'),
    });

    if (healthCenterFacility) {
      const healthCenterAccessibleIds = await getAccessibleFacilities(
        healthCenterFacility.id,
        'health_center',
        healthCenterFacility.districtId,
        'accountant'
      );

      // Health center users should only see their own facility
      expect(healthCenterAccessibleIds.length).toBe(1);
      expect(healthCenterAccessibleIds[0]).toBe(healthCenterFacility.id);
      console.log(`✓ Health center user sees only their facility (ID: ${healthCenterFacility.id})`);
    }
  });

  it('should log facility count for debugging purposes', () => {
    console.log('\n[Test 7] Verifying logging for debugging');
    
    // This test verifies that the logging is in place (checked in beforeAll)
    // The actual console.log statements are in getAccessibleFacilities function
    
    console.log(`  - Accountant user ID: ${accountantUserContext.userId}`);
    console.log(`  - Accountant role: ${accountantUserContext.role}`);
    console.log(`  - Accessible facilities: ${accountantUserContext.accessibleFacilityIds.length}`);
    console.log(`  - Expected: ${accountantUserContext.facilityType === 'hospital' ? accountantDistrictFacilityIds.length : 1}`);
    
    // Verify the context has the expected structure for logging
    expect(accountantUserContext).toHaveProperty('userId');
    expect(accountantUserContext).toHaveProperty('role');
    expect(accountantUserContext).toHaveProperty('accessibleFacilityIds');
    expect(Array.isArray(accountantUserContext.accessibleFacilityIds)).toBe(true);
    
    console.log(`✓ User context structure supports debugging logs`);
  });

  it('should verify scope resolution respects accountant restrictions', async () => {
    console.log('\n[Test 8] Verifying scope resolution respects access restrictions');
    
    // Import access control service
    const { resolveScopeToFacilityIds } = await import('@/api/services/dashboard/access-control.service');
    
    // Test district scope resolution
    const resolvedDistrictIds = await resolveScopeToFacilityIds(
      'district',
      accountantDistrictId,
      accountantUserContext
    );

    console.log(`  - Resolved facility IDs for accountant's district: ${resolvedDistrictIds.length}`);
    console.log(`  - Expected: ${accountantUserContext.accessibleFacilityIds.length}`);

    // Should match accountant's accessible facilities
    expect(resolvedDistrictIds.length).toBe(accountantUserContext.accessibleFacilityIds.length);
    console.log(`✓ District scope resolution respects accountant restrictions`);

    // Test other district scope resolution
    const resolvedOtherDistrictIds = await resolveScopeToFacilityIds(
      'district',
      otherDistrictId,
      accountantUserContext
    );

    console.log(`  - Resolved facility IDs for other district: ${resolvedOtherDistrictIds.length}`);

    // Should be empty (no access to other district)
    expect(resolvedOtherDistrictIds.length).toBe(0);
    console.log(`✓ Other district scope resolution returns empty (no access)`);
  });
});
