import { SQL, eq, inArray, and } from "drizzle-orm";
import { db } from "@/db";
import { schemaFormDataEntries, facilities, districts } from "@/db/schema";
import { UserContext, hasAdminAccess } from "./get-user-facility";

/**
 * Build WHERE clause for facility filtering based on user context
 * 
 * @param userContext - The user's context including accessible facilities
 * @param requestedFacilityId - Optional specific facility ID requested by user
 * @returns SQL condition for facility filtering, or undefined for admin users with no specific request
 * @throws Error if non-admin user requests facility outside their district
 */
export function buildFacilityFilter(
  userContext: UserContext,
  requestedFacilityId?: number
): SQL | undefined {
  // Admin users: no filtering unless they specifically request a facility
  if (hasAdminAccess(userContext.role, userContext.permissions)) {
    if (requestedFacilityId) {
      return eq(schemaFormDataEntries.facilityId, requestedFacilityId);
    }
    return undefined; // No filter - access all facilities
  }

  // Non-admin users: validate requested facility is in their accessible list
  if (requestedFacilityId) {
    if (!userContext.accessibleFacilityIds.includes(requestedFacilityId)) {
      throw new Error("Access denied: facility not in your district");
    }
    return eq(schemaFormDataEntries.facilityId, requestedFacilityId);
  }

  // No specific facility requested: filter by all accessible facilities
  // Single facility users (health centers) will have array with one element
  // Hospital users will have array with all district facilities
  if (userContext.accessibleFacilityIds.length === 1) {
    return eq(schemaFormDataEntries.facilityId, userContext.accessibleFacilityIds[0]);
  }

  return inArray(schemaFormDataEntries.facilityId, userContext.accessibleFacilityIds);
}

/**
 * Validate if a specific record is accessible to the user based on facility
 * 
 * @param recordId - The ID of the record to check
 * @param tableName - The table name ('planning' or 'execution' entity type)
 * @param userContext - The user's context including accessible facilities
 * @returns true if the record is accessible, false otherwise
 */
export async function validateRecordFacilityAccess(
  recordId: number,
  tableName: string,
  userContext: UserContext
): Promise<boolean> {
  // Admin users can access any record
  if (hasAdminAccess(userContext.role, userContext.permissions)) {
    return true;
  }

  // Fetch the record to check its facilityId
  const record = await db.query.schemaFormDataEntries.findFirst({
    where: and(
      eq(schemaFormDataEntries.id, recordId),
      eq(schemaFormDataEntries.entityType, tableName)
    ),
  });

  // Record not found
  if (!record) {
    return false;
  }

  // Check if the record's facility is in the user's accessible facilities
  return userContext.accessibleFacilityIds.includes(record.facilityId);
}

/**
 * Validate if a district exists in the database
 * 
 * @param districtId - The district ID to validate
 * @returns Promise<boolean> - true if district exists, false otherwise
 */
export async function validateDistrictExists(districtId: number): Promise<boolean> {
  try {
    const district = await db.query.districts.findFirst({
      where: eq(districts.id, districtId),
    });

    return !!district;
  } catch (error) {
    console.error('Error validating district existence:', error);
    return false;
  }
}

/**
 * Build facility filter based on district ID for admin users
 * This function filters facilities by district and returns a SQL condition
 * that can be used to filter execution data by facilities in the specified district
 * 
 * @param districtId - The district ID to filter by
 * @returns Promise<SQL | null> - SQL condition for facility filtering, or null if district invalid
 */
export async function buildDistrictBasedFacilityFilter(districtId: number): Promise<SQL | null> {
  try {
    // First validate that the district exists
    const districtExists = await validateDistrictExists(districtId);
    if (!districtExists) {
      return null;
    }

    // Get all facility IDs in the specified district
    const facilitiesInDistrict = await db
      .select({ id: facilities.id })
      .from(facilities)
      .where(eq(facilities.districtId, districtId));

    // If no facilities found in district, return null
    if (facilitiesInDistrict.length === 0) {
      return null;
    }

    // Extract facility IDs
    const facilityIds = facilitiesInDistrict.map(f => f.id);

    // Return SQL condition to filter by these facilities
    if (facilityIds.length === 1) {
      return eq(schemaFormDataEntries.facilityId, facilityIds[0]);
    }

    return inArray(schemaFormDataEntries.facilityId, facilityIds);
  } catch (error) {
    console.error('Error building district-based facility filter:', error);
    return null;
  }
}
