import { db } from '@/db';
import { facilities, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';

/**
 * Cache structure for facility hierarchy relationships
 */
interface FacilityHierarchyCache {
  [facilityId: number]: {
    parentId: number | null;
    childIds: number[];
    districtId: number;
    type: 'hospital' | 'health_center';
    lastUpdated: Date;
  };
}

/**
 * Cache for user accessible facility IDs
 */
interface UserAccessCache {
  [userId: number]: {
    facilityIds: number[];
    lastUpdated: Date;
  };
}

/**
 * Service for managing facility hierarchy and access control
 */
export class FacilityHierarchyService {
  private static hierarchyCache: FacilityHierarchyCache = {};
  private static userAccessCache: UserAccessCache = {};
  private static readonly CACHE_TTL = 3600000; // 1 hour in milliseconds

  /**
   * Get all facility IDs accessible to a user based on their role and facility
   * - Hospital users (DAF/DG): own facility + all child health centers
   * - Health center users: only own facility
   * - Admin/Superadmin: all facilities
   */
  static async getAccessibleFacilityIds(userId: number): Promise<number[]> {
    // Check cache first
    const cached = this.userAccessCache[userId];
    if (cached && Date.now() - cached.lastUpdated.getTime() < this.CACHE_TTL) {
      return cached.facilityIds;
    }

    // Get user details
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        role: true,
        facilityId: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new HTTPException(404, { message: 'User not found' });
    }

    if (!user.isActive) {
      throw new HTTPException(403, { message: 'User account is inactive' });
    }

    let accessibleIds: number[];

    // Admin and superadmin get access to all facilities
    if (user.role === 'admin' || user.role === 'superadmin') {
      const allFacilities = await db.query.facilities.findMany({
        columns: { id: true },
      });
      accessibleIds = allFacilities.map((f) => f.id);
    } else if (!user.facilityId) {
      // User has no facility assigned
      accessibleIds = [];
    } else {
      // Get user's facility details
      const userFacility = await db.query.facilities.findFirst({
        where: eq(facilities.id, user.facilityId),
      });

      if (!userFacility) {
        throw new HTTPException(404, { message: 'User facility not found' });
      }

      // For hospital users (DAF/DG), include own facility + child facilities
      if (
        userFacility.facilityType === 'hospital' &&
        (user.role === 'daf' || user.role === 'dg')
      ) {
        const childFacilities = await db.query.facilities.findMany({
          where: and(
            eq(facilities.parentFacilityId, user.facilityId),
            eq(facilities.districtId, userFacility.districtId)
          ),
          columns: { id: true },
        });

        accessibleIds = [
          user.facilityId,
          ...childFacilities.map((f) => f.id),
        ];
      } else {
        // Health center users and accountants only access their own facility
        accessibleIds = [user.facilityId];
      }
    }

    // Cache the result
    this.userAccessCache[userId] = {
      facilityIds: accessibleIds,
      lastUpdated: new Date(),
    };

    return accessibleIds;
  }

  /**
   * Get the parent hospital for a given facility
   * Returns null if facility is already a hospital
   */
  static async getParentHospital(facilityId: number): Promise<typeof facilities.$inferSelect | null> {
    const facility = await db.query.facilities.findFirst({
      where: eq(facilities.id, facilityId),
    });

    if (!facility) {
      throw new HTTPException(404, { message: 'Facility not found' });
    }

    // If it's already a hospital, return null
    if (facility.facilityType === 'hospital') {
      return null;
    }

    // If it's a health center with a parent, get the parent
    if (facility.parentFacilityId) {
      const parentFacility = await db.query.facilities.findFirst({
        where: eq(facilities.id, facility.parentFacilityId),
      });

      return parentFacility || null;
    }

    return null;
  }

  /**
   * Get all child facilities for a hospital
   */
  static async getChildFacilities(hospitalId: number): Promise<Array<typeof facilities.$inferSelect>> {
    const hospital = await db.query.facilities.findFirst({
      where: eq(facilities.id, hospitalId),
    });

    if (!hospital) {
      throw new HTTPException(404, { message: 'Hospital not found' });
    }

    if (hospital.facilityType !== 'hospital') {
      throw new HTTPException(400, { 
        message: 'Facility is not a hospital' 
      });
    }

    const childFacilities = await db.query.facilities.findMany({
      where: and(
        eq(facilities.parentFacilityId, hospitalId),
        eq(facilities.districtId, hospital.districtId)
      ),
    });

    return childFacilities;
  }

  /**
   * Validate if user can access a specific facility
   */
  static async canAccessFacility(userId: number, facilityId: number): Promise<boolean> {
    const accessibleIds = await this.getAccessibleFacilityIds(userId);
    return accessibleIds.includes(facilityId);
  }

  /**
   * Get DAF users for a facility's approval chain
   * - If health center: get DAF users from parent hospital
   * - If hospital: get DAF users from same hospital
   */
  static async getDafUsersForFacility(facilityId: number): Promise<Array<typeof users.$inferSelect>> {
    const facility = await db.query.facilities.findFirst({
      where: eq(facilities.id, facilityId),
    });

    if (!facility) {
      throw new HTTPException(404, { message: 'Facility not found' });
    }

    let targetFacilityId: number;

    // If health center, get parent hospital
    if (facility.facilityType === 'health_center' && facility.parentFacilityId) {
      targetFacilityId = facility.parentFacilityId;
    } else {
      // If hospital or health center without parent, use same facility
      targetFacilityId = facilityId;
    }

    // Get active DAF users at the target facility
    const dafUsers = await db.query.users.findMany({
      where: and(
        eq(users.role, 'daf'),
        eq(users.facilityId, targetFacilityId),
        eq(users.isActive, true)
      ),
    });

    return dafUsers;
  }

  /**
   * Get DG users for a facility's approval chain
   * - If health center: get DG users from parent hospital
   * - If hospital: get DG users from same hospital
   */
  static async getDgUsersForFacility(facilityId: number): Promise<Array<typeof users.$inferSelect>> {
    const facility = await db.query.facilities.findFirst({
      where: eq(facilities.id, facilityId),
    });

    if (!facility) {
      throw new HTTPException(404, { message: 'Facility not found' });
    }

    let targetFacilityId: number;

    // If health center, get parent hospital
    if (facility.facilityType === 'health_center' && facility.parentFacilityId) {
      targetFacilityId = facility.parentFacilityId;
    } else {
      // If hospital or health center without parent, use same facility
      targetFacilityId = facilityId;
    }

    // Get active DG users at the target facility
    const dgUsers = await db.query.users.findMany({
      where: and(
        eq(users.role, 'dg'),
        eq(users.facilityId, targetFacilityId),
        eq(users.isActive, true)
      ),
    });

    return dgUsers;
  }

  /**
   * Clear cache for a specific user (useful after user updates)
   */
  static clearUserCache(userId: number): void {
    delete this.userAccessCache[userId];
  }

  /**
   * Clear cache for a specific facility (useful after facility updates)
   */
  static clearFacilityCache(facilityId: number): void {
    delete this.hierarchyCache[facilityId];
    // Also clear all user caches since facility relationships may have changed
    this.userAccessCache = {};
  }

  /**
   * Clear all caches
   */
  static clearAllCaches(): void {
    this.hierarchyCache = {};
    this.userAccessCache = {};
  }
}
