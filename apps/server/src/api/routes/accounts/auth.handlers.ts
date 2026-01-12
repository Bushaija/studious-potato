import { eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import * as HttpStatusCodes from "stoker/http-status-codes"

import { db } from '@/api/db'
import { auth } from '@/api/lib/auth_'
import * as schema from '@/api/db/schema'
import type { AppRouteHandler } from "@/api/lib/types"
import type {
  UpdateProfileRoute,
  BanUser,
  UnbanUser,
} from "./auth.routes"


// Enhanced helper function to format user response
const formatUserResponse = (user: any, session: any) => {
  // Helper function to safely convert dates to ISO string
  const safeToISOString = (date: any) => {
    if (!date) return null;
    try {
      // If it's already a Date object
      if (date instanceof Date) {
        return date.toISOString();
      }
      // If it's a string or number, try to create a Date
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return null;
      }
      return parsedDate.toISOString();
    } catch (error) {
      console.warn('Date conversion error:', error);
      return null;
    }
  };

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      facilityId: user.facilityId,
      districtId: user.districtId,
      permissions: user.permissions || [],
      projectAccess: user.projectAccess || [],
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      banned: user.banned,
      banReason: user.banReason,
      banExpires: safeToISOString(user.banExpires),
      lastLoginAt: safeToISOString(user.lastLoginAt),
      createdAt: safeToISOString(user.createdAt),
      updatedAt: safeToISOString(user.updatedAt),
    },
    session: {
      id: session.id,
      token: session.token,
      expiresAt: safeToISOString(session.expiresAt),
    },
  };
};

export const formatBanDuration = (seconds: number): string => {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
  }
};

// Common ban duration constants (in seconds)
export const BAN_DURATIONS = {
  ONE_HOUR: 60 * 60,
  ONE_DAY: 60 * 60 * 24,
  ONE_WEEK: 60 * 60 * 24 * 7,
  ONE_MONTH: 60 * 60 * 24 * 30,
  THREE_MONTHS: 60 * 60 * 24 * 90,
  SIX_MONTHS: 60 * 60 * 24 * 180,
  ONE_YEAR: 60 * 60 * 24 * 365,
} as const;


export const banUser: AppRouteHandler<BanUser> = async (c) => {
  const { userId, banReason, banExpiresIn, banExpiresAt } = await c.req.json();

  try {
    // Check if user exists first
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.id, parseInt(userId))
    });

    if (!existingUser) {
      throw new HTTPException(404, {
        message: "User not found",
      });
    }

    // Check if user is already banned
    if (existingUser.banned) {
      throw new HTTPException(409, {
        message: "User is already banned",
      });
    }

    // Calculate ban expiration date if banExpiresIn is provided
    let calculatedBanExpires: Date | undefined;
    if (banExpiresIn) {
      calculatedBanExpires = new Date(Date.now() + (banExpiresIn * 1000));
    } else if (banExpiresAt) {
      calculatedBanExpires = new Date(banExpiresAt);
      if (isNaN(calculatedBanExpires.getTime())) {
        throw new HTTPException(400, {
          message: "Invalid banExpiresAt date format",
        });
      }
    }

    // Update our database directly since better-auth doesn't have banUser API
    const [updatedUser] = await db
      .update(schema.users)
      .set({
        banned: true,
        banReason: banReason,
        banExpires: calculatedBanExpires || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, parseInt(userId)))
      .returning();

    // Log the ban action
    console.log(`User banned - ID: ${userId}, Email: ${existingUser.email}, Reason: ${banReason}${
      calculatedBanExpires ? `, Expires: ${calculatedBanExpires.toISOString()}` : ' (Permanent)'
    }`);

    // Format response
    const response = {
      success: true,
      message: calculatedBanExpires 
        ? `User banned until ${calculatedBanExpires.toISOString()}` 
        : "User permanently banned",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        banned: updatedUser.banned,
        banReason: updatedUser.banReason,
        banExpires: updatedUser.banExpires ? updatedUser.banExpires.toISOString() : null,
      },
    };

    return c.json(response, HttpStatusCodes.OK);

  } catch (error: any) {
    console.error('Ban user error:', error);
    
    if (error instanceof HTTPException) {
      throw error;
    }

    // Handle specific better-auth errors
    if (error.message?.includes('User not found')) {
      throw new HTTPException(404, {
        message: 'User not found',
      });
    }

    if (error.message?.includes('already banned')) {
      throw new HTTPException(409, {
        message: 'User is already banned',
      });
    }

    if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
      throw new HTTPException(403, {
        message: 'Insufficient permissions to ban user',
      });
    }

    throw new HTTPException(500, {
      message: error.message || 'Failed to ban user',
    });
  }
};

// Unban user handler
export const unbanUser: AppRouteHandler<UnbanUser> = async (c) => {
  const { userId, reason } = await c.req.json();

  try {
    // Check if user exists first
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.id, parseInt(userId))
    });

    if (!existingUser) {
      throw new HTTPException(404, {
        message: 'User not found',
      });
    }

    // Check if user is actually banned
    if (!existingUser.banned) {
      throw new HTTPException(409, {
        message: 'User is not currently banned',
      });
    }

    // Update database directly since better-auth doesn't have unbanUser API
    const updatedUser = await db
      .update(schema.users)
      .set({
        banned: false,
        banReason: null,
        banExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, parseInt(userId)))
      .returning();

    if (!updatedUser || updatedUser.length === 0) {
      throw new HTTPException(500, {
        message: 'Failed to update user in local database',
      });
    }

    console.log(`User ${userId} unbanned${reason ? `, Reason: ${reason}` : ''}`);

    // Format response
    const response = {
      success: true,
      message: "User successfully unbanned",
      user: {
        id: updatedUser[0].id,
        email: updatedUser[0].email,
        banned: updatedUser[0].banned,
        banReason: updatedUser[0].banReason,
        banExpires: updatedUser[0].banExpires,
      },
    };

    return c.json(response, HttpStatusCodes.OK);

  } catch (error: any) {
    console.error('Unban user error:', error);
    
    if (error instanceof HTTPException) {
      throw error;
    }

    // Handle specific better-auth errors
    if (error.message?.includes('User not found')) {
      throw new HTTPException(404, {
        message: 'User not found',
      });
    }

    if (error.message?.includes('not banned')) {
      throw new HTTPException(409, {
        message: 'User is not currently banned',
      });
    }

    if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
      throw new HTTPException(403, {
        message: 'Insufficient permissions to unban user',
      });
    }

    throw new HTTPException(500, {
      message: error.message || 'Failed to unban user',
    });
  }
};


// Update profile handler
export const updateProfile: AppRouteHandler<UpdateProfileRoute> = async (c) => {
  const { name, email, currentPassword, newPassword } = await c.req.json()

  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    })

    if (!session) {
      throw new HTTPException(401, {
        message: 'Authentication required',
      })
    }

    // Update user profile
    const updateData: any = {}
    if (name) updateData.name = name
    if (email) updateData.email = email

    const result = await auth.api.updateUser({
      body: updateData,
      headers: c.req.header(),
    })

    // Handle password change
    if (currentPassword && newPassword) {
      await auth.api.changePassword({
        body: {
          currentPassword,
          newPassword,
        },
        headers: c.req.header(),
      })

      // Clear mustChangePassword flag if set
      await db
        .update(schema.users)
        .set({ 
          mustChangePassword: false,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, parseInt(session.user.id)))
    }

    return c.json({
      user: formatUserResponse(result, session.session).user,
      message: 'Profile updated successfully',
    }, HttpStatusCodes.OK)
  } catch (error: any) {
    console.error('Update profile error:', error)
    
    if (error.message?.includes('password')) {
      throw new HTTPException(400, {
        message: 'Current password is incorrect',
      })
    }
    
    throw new HTTPException(400, {
      message: error.message || 'Failed to update profile',
    })
  }
};


// Get accessible facilities handler
export const getAccessibleFacilities: AppRouteHandler<typeof import("./auth.routes").getAccessibleFacilities> = async (c) => {
  const session = c.get("user");
  
  if (!session) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: "Not authenticated",
    });
  }

  try {
    // Get user from database with facility information
    const userId = typeof session.id === 'string' ? parseInt(session.id, 10) : session.id;
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      with: {
        facility: {
          with: {
            district: true,
          },
        },
      },
    });

    if (!user || !user.facility) {
      return c.json({
        facilityIds: [],
        count: 0,
        role: user?.role || "unknown",
        facilityType: null,
        districtId: null,
      });
    }

    // Import the getAccessibleFacilities function
    const { getAccessibleFacilities: getAccessibleFacilitiesUtil } = await import('@/lib/utils/get-user-facility');
    
    // Get accessible facilities for the user
    const accessibleFacilityIds = await getAccessibleFacilitiesUtil(
      user.facilityId!,
      user.facility.facilityType,
      user.facility.districtId,
      user.role
    );

    console.log(`[API] User ${user.id} (${user.role}) has access to ${accessibleFacilityIds.length} facilities`);

    return c.json({
      facilityIds: accessibleFacilityIds,
      count: accessibleFacilityIds.length,
      role: user.role,
      facilityType: user.facility.facilityType,
      districtId: user.facility.districtId,
    });
  } catch (error) {
    console.error("Error fetching accessible facilities:", error);
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: "Failed to fetch accessible facilities",
    });
  }
};


