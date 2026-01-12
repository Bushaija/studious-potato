import { db } from '@/db';
import { facilities, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { HierarchyAuthorizationError, HierarchyValidationError } from '@/lib/errors/hierarchy.errors';

/**
 * Validate that DAF/DG roles are only assigned to hospital-type facilities
 * 
 * @param role - User role to validate
 * @param facilityId - Facility ID to check
 * @throws HierarchyValidationError if validation fails
 */
export async function validateRoleFacilityConsistency(
  role: string,
  facilityId: number | null
): Promise<void> {
  // DAF and DG roles require a facility assignment
  if ((role === 'daf' || role === 'dg') && !facilityId) {
    throw new HierarchyValidationError(
      `${role.toUpperCase()} role requires a facility assignment`,
      {
        role,
        facilityId,
        reason: 'DAF and DG roles must be assigned to a specific facility',
      }
    );
  }

  // If role is DAF or DG, validate facility type is hospital
  if ((role === 'daf' || role === 'dg') && facilityId) {
    const facility = await db.query.facilities.findFirst({
      where: eq(facilities.id, facilityId),
      columns: {
        id: true,
        name: true,
        facilityType: true,
        districtId: true,
      },
    });

    if (!facility) {
      throw new HierarchyValidationError(
        `Facility with ID ${facilityId} not found`,
        {
          role,
          facilityId,
          reason: 'The specified facility does not exist',
        }
      );
    }

    if (facility.facilityType !== 'hospital') {
      throw new HierarchyValidationError(
        `${role.toUpperCase()} role can only be assigned to hospital facilities. Facility "${facility.name}" is a ${facility.facilityType}`,
        {
          role,
          facilityId,
          facilityName: facility.name,
          facilityType: facility.facilityType,
          reason: 'DAF and DG roles are restricted to hospital-type facilities only',
        }
      );
    }
  }
}

/**
 * Validate that two facilities are in the same district
 * Prevents cross-district operations
 * 
 * @param facilityId1 - First facility ID
 * @param facilityId2 - Second facility ID
 * @throws HierarchyAuthorizationError if facilities are in different districts
 */
export async function validateSameDistrict(
  facilityId1: number,
  facilityId2: number
): Promise<void> {
  const [facility1, facility2] = await Promise.all([
    db.query.facilities.findFirst({
      where: eq(facilities.id, facilityId1),
      columns: {
        id: true,
        name: true,
        districtId: true,
      },
    }),
    db.query.facilities.findFirst({
      where: eq(facilities.id, facilityId2),
      columns: {
        id: true,
        name: true,
        districtId: true,
      },
    }),
  ]);

  if (!facility1) {
    throw new HierarchyValidationError(
      `Facility with ID ${facilityId1} not found`,
      {
        facilityId: facilityId1,
        reason: 'The specified facility does not exist',
      }
    );
  }

  if (!facility2) {
    throw new HierarchyValidationError(
      `Facility with ID ${facilityId2} not found`,
      {
        facilityId: facilityId2,
        reason: 'The specified facility does not exist',
      }
    );
  }

  if (facility1.districtId !== facility2.districtId) {
    throw new HierarchyAuthorizationError(
      `Cross-district operation not allowed. Facility "${facility1.name}" (District ${facility1.districtId}) and "${facility2.name}" (District ${facility2.districtId}) are in different districts`,
      {
        userFacilityId: facilityId1,
        targetFacilityId: facilityId2,
        userDistrictId: facility1.districtId,
        targetDistrictId: facility2.districtId,
        userFacilityName: facility1.name,
        targetFacilityName: facility2.name,
        reason: 'Operations are restricted to facilities within the same district',
      }
    );
  }
}

/**
 * Validate that a user has access to a specific facility based on hierarchy
 * 
 * @param userId - User ID to check
 * @param targetFacilityId - Target facility ID to access
 * @param accessibleFacilityIds - Optional pre-computed list of accessible facility IDs
 * @throws HierarchyAuthorizationError if user cannot access the facility
 */
export async function validateHierarchyAccess(
  userId: number,
  targetFacilityId: number,
  accessibleFacilityIds?: number[]
): Promise<void> {
  // Get user details
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
      facilityId: true,
      isActive: true,
    },
  });

  if (!user) {
    throw new HierarchyValidationError(
      `User with ID ${userId} not found`,
      {
        userId,
        reason: 'The specified user does not exist',
      }
    );
  }

  if (!user.isActive) {
    throw new HierarchyAuthorizationError(
      'User account is inactive',
      {
        userId,
        userName: user.name,
        reason: 'Inactive users cannot access facilities',
      }
    );
  }

  // Admin and superadmin have access to all facilities
  if (user.role === 'admin' || user.role === 'superadmin') {
    return;
  }

  // Get target facility details
  const targetFacility = await db.query.facilities.findFirst({
    where: eq(facilities.id, targetFacilityId),
    columns: {
      id: true,
      name: true,
      facilityType: true,
      districtId: true,
    },
  });

  if (!targetFacility) {
    throw new HierarchyValidationError(
      `Facility with ID ${targetFacilityId} not found`,
      {
        targetFacilityId,
        reason: 'The specified facility does not exist',
      }
    );
  }

  // If accessible facility IDs are provided, use them
  if (accessibleFacilityIds) {
    if (!accessibleFacilityIds.includes(targetFacilityId)) {
      throw new HierarchyAuthorizationError(
        `Access denied: Facility "${targetFacility.name}" is outside your district hierarchy`,
        {
          userId,
          userName: user.name,
          userRole: user.role,
          userFacilityId: user.facilityId,
          targetFacilityId,
          targetFacilityName: targetFacility.name,
          reason: 'User does not have access to this facility based on hierarchy rules',
        }
      );
    }
    return;
  }

  // Otherwise, compute access on the fly
  if (!user.facilityId) {
    throw new HierarchyAuthorizationError(
      'User has no facility assignment',
      {
        userId,
        userName: user.name,
        userRole: user.role,
        reason: 'Users without facility assignments cannot access facilities',
      }
    );
  }

  // Get user's facility
  const userFacility = await db.query.facilities.findFirst({
    where: eq(facilities.id, user.facilityId),
    columns: {
      id: true,
      name: true,
      facilityType: true,
      districtId: true,
    },
  });

  if (!userFacility) {
    throw new HierarchyValidationError(
      `User's facility with ID ${user.facilityId} not found`,
      {
        userId,
        userFacilityId: user.facilityId,
        reason: 'User is assigned to a non-existent facility',
      }
    );
  }

  // Check if facilities are in the same district
  if (userFacility.districtId !== targetFacility.districtId) {
    throw new HierarchyAuthorizationError(
      `Access denied: Facility "${targetFacility.name}" is in a different district`,
      {
        userId,
        userName: user.name,
        userRole: user.role,
        userFacilityId: user.facilityId,
        userFacilityName: userFacility.name,
        userDistrictId: userFacility.districtId,
        targetFacilityId,
        targetFacilityName: targetFacility.name,
        targetDistrictId: targetFacility.districtId,
        reason: 'Cross-district access is not permitted',
      }
    );
  }

  // For hospital users (DAF/DG), check if target is own facility or child
  if (
    userFacility.facilityType === 'hospital' &&
    (user.role === 'daf' || user.role === 'dg')
  ) {
    // Can access own facility
    if (targetFacilityId === user.facilityId) {
      return;
    }

    // Check if target is a child facility
    const isChild = await db.query.facilities.findFirst({
      where: and(
        eq(facilities.id, targetFacilityId),
        eq(facilities.parentFacilityId, user.facilityId)
      ),
    });

    if (isChild) {
      return;
    }

    throw new HierarchyAuthorizationError(
      `Access denied: Facility "${targetFacility.name}" is not in your hierarchy`,
      {
        userId,
        userName: user.name,
        userRole: user.role,
        userFacilityId: user.facilityId,
        userFacilityName: userFacility.name,
        targetFacilityId,
        targetFacilityName: targetFacility.name,
        reason: 'Hospital users can only access their own facility and child health centers',
      }
    );
  }

  // For health center users and accountants, only own facility
  if (targetFacilityId !== user.facilityId) {
    throw new HierarchyAuthorizationError(
      `Access denied: You can only access your own facility`,
      {
        userId,
        userName: user.name,
        userRole: user.role,
        userFacilityId: user.facilityId,
        userFacilityName: userFacility.name,
        targetFacilityId,
        targetFacilityName: targetFacility.name,
        reason: 'Health center users can only access their assigned facility',
      }
    );
  }
}
