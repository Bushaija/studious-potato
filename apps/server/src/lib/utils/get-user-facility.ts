import { db } from "@/db";
import { auth } from '@/lib/auth_'
import { eq } from "drizzle-orm";
import { users, facilities } from "@/db/schema";

// Interface for user context with district information
export interface UserContext {
  userId: number;
  facilityId: number;
  districtId: number | null;
  facilityType: 'hospital' | 'health_center';
  accessibleFacilityIds: number[];
  role: string;
  permissions: string[];
}

export async function getUserFacility(c: any) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, parseInt(session.user.id)),
  });

  console.log("user::", user);

  if (!user?.facilityId) {
    throw new Error("User not associated with a facility");
  }

  return {
    userId: user.id,
    facilityId: user.facilityId,
    role: user.role,
    permissions: user.permissions || [],
  };
}

export async function getUserContext(c: any): Promise<UserContext> {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, parseInt(session.user.id)),
  });

  if (!user?.facilityId) {
    throw new Error("User not associated with a facility");
  }

  // Get the user's facility to determine their district and facility type
  const userFacility = await db.query.facilities.findFirst({
    where: eq(facilities.id, user.facilityId),
  });

  if (!userFacility) {
    throw new Error("User facility not found");
  }

  // Handle edge case where facility has no district_id
  const districtId = userFacility.districtId || null;
  const facilityType = userFacility.facilityType;

  // Get accessible facilities based on facility type and district
  const accessibleFacilityIds = await getAccessibleFacilities(
    user.facilityId,
    facilityType,
    districtId,
    user.role
  );

  console.log(`[UserContext] User ${user.id} (${user.role}): ${accessibleFacilityIds.length} accessible facilities`);

  return {
    userId: user.id,
    facilityId: user.facilityId,
    districtId,
    facilityType,
    accessibleFacilityIds,
    role: user.role,
    permissions: user.permissions || [],
  };
}

/**
 * Helper to determine accessible facility IDs based on facility type and district
 * 
 * Access Control Rules:
 * - Admin/Superadmin users: ALL facilities in the system (facility assignment is ignored)
 * - Hospital users: all facilities in their district
 * - Health center users: only their own facility
 * - If no district_id: only their own facility (isolated facility)
 * 
 * Note: Admin users may have a facility assignment for context (home base, defaults, audit),
 * but this does NOT restrict their access. They can access all facilities regardless.
 */
export async function getAccessibleFacilities(
  facilityId: number,
  facilityType: 'hospital' | 'health_center',
  districtId: number | null,
  role: string
): Promise<number[]> {
  // Admin users have access to ALL facilities (facility assignment is for context only)
  if (role === 'admin' || role === 'superadmin') {
    const allFacilities = await db
      .select({ id: facilities.id })
      .from(facilities);
    
    const facilityIds = allFacilities.map(f => f.id);
    
    console.log(`[Access] Admin user (role=${role}): ${facilityIds.length} facilities accessible (unrestricted)`);
    
    return facilityIds;
  }

  // If no district_id, treat as isolated facility (only accessible to itself)
  if (!districtId) {
    return [facilityId];
  }

  // Health center users can only access their own facility
  if (facilityType === 'health_center') {
    return [facilityId];
  }

  // Hospital users can access all facilities in their district
  if (facilityType === 'hospital') {
    const districtFacilities = await db
      .select({ id: facilities.id })
      .from(facilities)
      .where(eq(facilities.districtId, districtId));

    return districtFacilities.map(f => f.id);
  }

  // Default: only own facility
  return [facilityId];
}

// Helper to check if user can access a specific facility
export function canAccessFacility(
  facilityId: number,
  userContext: UserContext
): boolean {
  // Admins can access all facilities
  if (hasAdminAccess(userContext.role, userContext.permissions)) {
    return true;
  }
  
  // Regular users can only access facilities in their accessible list
  return userContext.accessibleFacilityIds.includes(facilityId);
}

export function hasAdminAccess(role: string, permissions: string[]): boolean {
  return role === 'superadmin' || role === 'admin' || permissions?.includes('admin_access');
}