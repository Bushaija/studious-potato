import { HTTPException } from 'hono/http-exception'
import * as HttpStatusCodes from "stoker/http-status-codes"
import { db } from '@/api/db'
import * as schema from '@/api/db/schema'
import { auth } from '@/api/lib/auth_'
import { eq, desc, count, inArray } from 'drizzle-orm'
import type { AppRouteHandler, ExtendedUserWithRole } from "@/api/lib/types"
import { ValidationService } from '../../services/validation.service'
import type {
  CreateUserAccountRoute,
  GetUsersRoute,
  GetUserRoute,
  UpdateUserRoute,
  ToggleUserStatusRoute,
  ResetUserPasswordRoute,
  DeleteUserRoute,
  GetUserActivityLogsRoute,
  BulkUserOperationsRoute,
  GetSystemStatsRoute,
} from "./admin.routes"
import { sendAccountCreationEmail, sendAccountStatusEmail } from '@/api/lib/email.service'

// Helper function to check admin permissions
const checkAdminPermissions = async (headers: Headers, requiredRole: 'admin' | 'superadmin' = 'admin') => {
  const session = await auth.api.getSession({ headers })
  
  if (!session) {
    throw new HTTPException(401, { message: 'Authentication required' })
  }
  
  const allowedRoles = requiredRole === 'superadmin' ? ['superadmin'] : ['admin', 'superadmin']
  const userRole = (session.user as any)?.role
  
  if (!allowedRoles.includes(userRole)) {
    throw new HTTPException(403, { message: 'Admin privileges required' })
  }
  
  return session
}

// Generate secure temporary password
const generateTemporaryPassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// Create user account using better-auth admin API
export const createUserAccount: AppRouteHandler<CreateUserAccountRoute> = async (c) => {
  const adminSession = await checkAdminPermissions(c.req.raw.headers)
  const { name, email, role, facilityId, permissions, projectAccess, sendWelcomeEmail } = await c.req.json()

  try {
    // Validate permissions and projectAccess if provided
    if (permissions && permissions.length > 0) {
      await ValidationService.validatePermissions(permissions);
    }
    if (projectAccess && projectAccess.length > 0) {
      await ValidationService.validateProjectAccess(projectAccess);
    }

    // Validate DAF/DG role assignments using hierarchy validation
    if (role === 'daf' || role === 'dg') {
      const { validateRoleFacilityConsistency } = await import('@/lib/utils/hierarchy-validation');
      try {
        await validateRoleFacilityConsistency(role, facilityId || null);
      } catch (error: any) {
        throw new HTTPException(400, {
          message: error.message || `${role.toUpperCase()} role validation failed`,
        });
      }
    }

    const temporaryPassword = generateTemporaryPassword()

    const result = await auth?.api.createUser({
      body: {
        email,
        password: temporaryPassword,
        name,
        role: role || "accountant",
        data: {
          facilityId: facilityId || null,
          permissions: permissions || [],
          projectAccess: projectAccess || [],
          isActive: true,
          mustChangePassword: true,
          createdBy: adminSession.user.id
        }
      },
      headers: c.req.raw.headers
    })

    const user = result.user as ExtendedUserWithRole;

    if (!user) {
      throw new HTTPException(400, { message: 'Failed to create user account' })
    }

    // Send welcome email if requested
    if (sendWelcomeEmail) {
      try {
        await sendAccountCreationEmail({
          email,
          inviterEmail: adminSession.user.email,
          organizationName: 'Budget Management System',
          inviteLink: `${process.env.FRONTEND_URL || 'http://localhost:2222'}/sign-in`,
          temporaryPassword,
        })
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError)
      }
    }

    return c.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        facilityId: user.facilityId,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        createdBy: user.createdBy || adminSession.user.id,
        mustChangePassword: user.mustChangePassword || true,
      },
      temporaryPassword,
      message: 'User account created successfully',
    }, HttpStatusCodes.CREATED)

  } catch (error: any) {
    console.error('Create user error:', error)
    
    if (error instanceof HTTPException) {
      throw error
    }
    
    throw new HTTPException(400, { message: error?.message || 'Failed to create user account' })
  }
}

// Get all users using better-auth admin API
export const getUsers: AppRouteHandler<GetUsersRoute> = async (c) => {
  await checkAdminPermissions(c.req.raw.headers)
  
  const { page = '1', limit = '10', role, facilityId, isActive, banned, search } = c.req.query()
  
  const pageNum = parseInt(page)
  const limitNum = parseInt(limit)
  const offset = (pageNum - 1) * limitNum

  try {
    // Build better-auth admin listUsers query
    const listQuery: any = {
      limit: limitNum,
      offset,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    }

    if (search) {
      listQuery.searchValue = search
      listQuery.searchField = 'name'
      listQuery.searchOperator = 'contains'
    }

    // Add single filter (prioritize role > facilityId > isActive > banned)
    if (role) {
      listQuery.filterField = 'role'
      listQuery.filterValue = role
      listQuery.filterOperator = 'eq'
    } else if (facilityId) {
      listQuery.filterField = 'facilityId'
      listQuery.filterValue = parseInt(facilityId)
      listQuery.filterOperator = 'eq'
    } else if (typeof isActive !== 'undefined') {
      listQuery.filterField = 'isActive'
      listQuery.filterValue = isActive === 'true'
      listQuery.filterOperator = 'eq'
    } else if (typeof banned !== 'undefined') {
      listQuery.filterField = 'banned'
      listQuery.filterValue = banned === 'true'
      listQuery.filterOperator = 'eq'
    }

    const listResult = await auth.api.listUsers({
      query: listQuery,
      headers: c.req.raw.headers,
    })

    const users = listResult?.users || []
    const totalCount = listResult?.total || users.length

    // Fetch facility names for users with facilityId
    const facilityIds = users
      .map((user: any) => user.facilityId)
      .filter((id: any) => id != null)
    
    const facilitiesMap = new Map<number, string>()
    
    if (facilityIds.length > 0) {
      const facilities = await db.query.facilities.findMany({
        where: inArray(schema.facilities.id, facilityIds),
        columns: {
          id: true,
          name: true,
        },
      })
      
      facilities.forEach(facility => {
        facilitiesMap.set(facility.id, facility.name)
      })
    }

    return c.json({
      users: users.map((user: any) => ({
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified ?? false,
        image: user.image ?? null,
        role: user.role,
        facilityId: user.facilityId,
        facilityName: user.facilityId ? facilitiesMap.get(user.facilityId) ?? null : null,
        permissions: user.permissions ?? [],
        projectAccess: user.projectAccess ?? [],
        configAccess: user.configAccess ?? null,
        isActive: user.isActive ?? true,
        mustChangePassword: user.mustChangePassword ?? false,
        banned: user.banned ?? false,
        banReason: user.banReason ?? null,
        banExpires: user.banExpires ? new Date(user.banExpires).toISOString() : null,
        lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : null,
        createdAt: new Date(user.createdAt).toISOString(),
        updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : new Date(user.createdAt).toISOString(),
        createdBy: user.createdBy ?? null,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
      filters: {
        role: role ?? null,
        banned: banned ?? null,
        isActive: isActive ?? null,
        facilityId: facilityId ?? null,
      },
    }, HttpStatusCodes.OK)

  } catch (error: any) {
    console.error('Get users error:', error)
    throw new HTTPException(500, { message: 'Failed to retrieve users' })
  }
}

// Get single user
export const getUser: AppRouteHandler<GetUserRoute> = async (c) => {
  await checkAdminPermissions(c.req.raw.headers)
  const { userId } = c.req.param()

  try {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, parseInt(userId)),
      with: {
        facility: {
          columns: { id: true, name: true, facilityType: true }
        }
      }
    })

    if (!user) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    return c.json({
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified ?? false,
      image: user.image ?? null,
      role: user.role,
      facilityId: user.facilityId,
      permissions: user.permissions ?? [],
      projectAccess: user.projectAccess ?? [],
      configAccess: user.configAccess ?? null,
      isActive: user.isActive ?? true,
      mustChangePassword: user.mustChangePassword ?? false,
      banned: user.banned ?? false,
      banReason: user.banReason ?? null,
      banExpires: user.banExpires ? new Date(user.banExpires).toISOString() : null,
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : new Date(user.createdAt).toISOString(),
      createdBy: user.createdBy ?? null,
      facility: user.facility,
    }, HttpStatusCodes.OK)

  } catch (error: any) {
    console.error('Get user error:', error)
    
    if (error instanceof HTTPException) {
      throw error
    }
    
    throw new HTTPException(500, { message: 'Failed to retrieve user' })
  }
}

// Update user using better-auth admin API
export const updateUser: AppRouteHandler<UpdateUserRoute> = async (c) => {
  const adminSession = await checkAdminPermissions(c.req.raw.headers)
  const { userId } = c.req.param()
  const updates = await c.req.json()

  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.id, parseInt(userId))
    })

    if (!existingUser) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    if (existingUser.role === 'admin' && adminSession.user.role !== 'superadmin') {
      throw new HTTPException(403, { message: 'Cannot modify admin user' })
    }

    if (updates.facilityId) {
      const facility = await db.query.facilities.findFirst({
        where: eq(schema.facilities.id, updates.facilityId)
      })
      if (!facility) {
        throw new HTTPException(400, { message: 'Invalid facility ID' })
      }
    }

    // Validate DAF/DG role assignments using hierarchy validation
    const roleToValidate = updates.role || existingUser.role;
    const facilityToValidate = updates.facilityId !== undefined ? updates.facilityId : existingUser.facilityId;
    
    if (roleToValidate === 'daf' || roleToValidate === 'dg') {
      const { validateRoleFacilityConsistency } = await import('@/lib/utils/hierarchy-validation');
      try {
        await validateRoleFacilityConsistency(roleToValidate, facilityToValidate);
      } catch (error: any) {
        throw new HTTPException(400, {
          message: error.message || `${roleToValidate.toUpperCase()} role validation failed`,
        });
      }
    }

    // Use better-auth to update role if provided
    if (updates.role && updates.role !== existingUser.role) {
      await auth.api.setRole({
        body: {
          userId: userId.toString(),
          role: updates.role,
        },
        headers: c.req.raw.headers,
      })
    }

    // Validate permissions and projectAccess if provided
    if (updates.permissions) {
      await ValidationService.validatePermissions(updates.permissions);
    }
    if (updates.projectAccess) {
      await ValidationService.validateProjectAccess(updates.projectAccess);
    }

    // Update other fields in database
    const [updatedUser] = await db
      .update(schema.users)
      .set({
        name: updates.name || existingUser.name,
        email: updates.email || existingUser.email,
        facilityId: updates.facilityId !== undefined ? updates.facilityId : existingUser.facilityId,
        permissions: updates.permissions !== undefined ? updates.permissions : existingUser.permissions,
        projectAccess: updates.projectAccess !== undefined ? updates.projectAccess : existingUser.projectAccess,
        isActive: updates.isActive !== undefined ? updates.isActive : existingUser.isActive,
        mustChangePassword: updates.mustChangePassword !== undefined ? updates.mustChangePassword : existingUser.mustChangePassword,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, parseInt(userId)))
      .returning()

    return c.json({
      id: updatedUser.id.toString(),
      name: updatedUser.name,
      email: updatedUser.email,
      emailVerified: updatedUser.emailVerified ?? false,
      role: updates.role || updatedUser.role,
      facilityId: updatedUser.facilityId,
      permissions: updatedUser.permissions || [],
      projectAccess: updatedUser.projectAccess || [],
      isActive: updatedUser.isActive,
      mustChangePassword: updatedUser.mustChangePassword || false,
      banned: updatedUser.banned || false,
      banReason: updatedUser.banReason || null,
      banExpires: updatedUser.banExpires ? updatedUser.banExpires.toISOString() : null,
      lastLoginAt: updatedUser.lastLoginAt?.toISOString() || null,
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt ? updatedUser.updatedAt.toISOString() : updatedUser.createdAt.toISOString(),
      createdBy: updatedUser.createdBy || null,
    }, HttpStatusCodes.OK)

  } catch (error: any) {
    console.error('Update user error:', error)
    
    if (error instanceof HTTPException) {
      throw error
    }
    
    throw new HTTPException(500, { message: 'Failed to update user' })
  }
}

// Toggle user status using better-auth ban/unban
export const toggleUserStatus: AppRouteHandler<ToggleUserStatusRoute> = async (c) => {
  const adminSession = await checkAdminPermissions(c.req.raw.headers)
  const { userId } = c.req.param()
  const { isActive, reason } = await c.req.json()

  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.id, parseInt(userId))
    })

    if (!existingUser) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    if (existingUser.role === 'admin' && adminSession.user.role !== 'superadmin') {
      throw new HTTPException(403, { message: 'Cannot modify admin user status' })
    }

    if (parseInt(userId) === parseInt(adminSession.user.id) && !isActive) {
      throw new HTTPException(400, { message: 'Cannot deactivate your own account' })
    }

    if (isActive) {
      // Unban user to activate
      await auth.api.unbanUser({
        body: { userId: userId.toString() },
        headers: c.req.raw.headers,
      })
    } else {
      // Ban user to deactivate
      await auth.api.banUser({
        body: { 
          userId: userId.toString(),
          banReason: reason || 'Account deactivated by admin',
        },
        headers: c.req.raw.headers,
      })
    }

    // Update local database
    const [updatedUser] = await db
      .update(schema.users)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, parseInt(userId)))
      .returning()

    // Send status change notification
    try {
      await sendAccountStatusEmail({
        email: updatedUser.email,
        name: updatedUser.name,
        status: isActive ? 'activated' : 'deactivated',
        adminName: adminSession.user.name,
      })
    } catch (emailError) {
      console.error('Failed to send status change email:', emailError)
    }

    return c.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        facilityId: updatedUser.facilityId,
        isActive: updatedUser.isActive,
        lastLoginAt: updatedUser.lastLoginAt?.toISOString() || null,
        createdAt: updatedUser.createdAt.toISOString(),
        createdBy: updatedUser.createdBy || null,
        mustChangePassword: updatedUser.mustChangePassword || false,
      },
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
    }, HttpStatusCodes.OK)

  } catch (error: any) {
    console.error('Toggle user status error:', error)
    
    if (error instanceof HTTPException) {
      throw error
    }
    
    throw new HTTPException(500, { message: 'Failed to update user status' })
  }
}

// Reset user password using better-auth admin API
export const resetUserPassword: AppRouteHandler<ResetUserPasswordRoute> = async (c) => {
  const adminSession = await checkAdminPermissions(c.req.raw.headers)
  const { userId } = c.req.param()
  const { sendEmail } = await c.req.json()

  try {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, parseInt(userId))
    })

    if (!user) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    const temporaryPassword = generateTemporaryPassword()

    // Update password using better-auth admin API
    await auth.api.setUserPassword({
      body: {
        newPassword: temporaryPassword,
        userId: userId.toString(),
      },
      headers: c.req.raw.headers,
    })

    // Set must change password flag
    await db
      .update(schema.users)
      .set({
        mustChangePassword: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, parseInt(userId)))

    // Send password reset email if requested
    if (sendEmail) {
      try {
        await sendAccountCreationEmail({
          email: user.email,
          inviterEmail: adminSession.user.email,
          organizationName: 'Budget Management System',
          inviteLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/sign-in`,
          temporaryPassword,
        })
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError)
      }
    }

    return c.json({
      temporaryPassword,
      message: 'Password reset successfully',
    }, HttpStatusCodes.OK)

  } catch (error: any) {
    console.error('Reset password error:', error)
    
    if (error instanceof HTTPException) {
      throw error
    }
    
    throw new HTTPException(500, { message: 'Failed to reset password' })
  }
}

// Delete user using better-auth admin API
export const deleteUser: AppRouteHandler<DeleteUserRoute> = async (c) => {
  const adminSession = await checkAdminPermissions(c.req.raw.headers, 'superadmin')
  const { userId } = c.req.param()

  try {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, parseInt(userId))
    })

    if (!user) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    if (parseInt(userId) === parseInt(adminSession.user.id)) {
      throw new HTTPException(400, { message: 'Cannot delete your own account' })
    }

    // Delete user using better-auth admin API
    await auth.api.removeUser({
      body: { userId: userId.toString() },
      headers: c.req.raw.headers,
    })

    return c.json({
      message: 'User deleted successfully',
    }, HttpStatusCodes.OK)

  } catch (error: any) {
    console.error('Delete user error:', error)
    
    if (error instanceof HTTPException) {
      throw error
    }
    
    throw new HTTPException(500, { message: 'Failed to delete user' })
  }
}

// Get user activity logs using better-auth session API
export const getUserActivityLogs: AppRouteHandler<GetUserActivityLogsRoute> = async (c) => {
  await checkAdminPermissions(c.req.raw.headers)
  const { userId } = c.req.param()
  const { page = '1', limit = '10', startDate, endDate } = c.req.query()

  try {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, parseInt(userId))
    })

    if (!user) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    // Get user sessions using better-auth admin API
    const sessionsResult = await auth.api.listUserSessions({
      body: { userId: userId.toString() },
      headers: c.req.raw.headers,
    })

    const sessions = sessionsResult?.sessions || []
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)

    // Convert sessions to activity logs format
    const logs = sessions
      .filter(session => {
        if (!startDate && !endDate) return true
        const sessionDate = new Date(session.createdAt)
        if (startDate && sessionDate < new Date(startDate)) return false
        if (endDate && sessionDate > new Date(endDate)) return false
        return true
      })
      .slice((pageNum - 1) * limitNum, pageNum * limitNum)
      .map((session: any, index: number) => ({
        id: index + 1,
        action: 'User Login',
        details: {
          sessionId: session.id,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
        },
        createdAt: session.createdAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      }))

    return c.json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: sessions.length,
        totalPages: Math.ceil(sessions.length / limitNum),
      },
    }, HttpStatusCodes.OK)

  } catch (error: any) {
    console.error('Get activity logs error:', error)
    
    if (error instanceof HTTPException) {
      throw error
    }
    
    throw new HTTPException(500, { message: 'Failed to retrieve activity logs' })
  }
}

// Bulk user operations using better-auth admin APIs
export const bulkUserOperations: AppRouteHandler<BulkUserOperationsRoute> = async (c) => {
  const adminSession = await checkAdminPermissions(c.req.raw.headers)
  const { operation, userIds, reason } = await c.req.json()

  const success: number[] = []
  const failed: Array<{ userId: number, reason: string }> = []

  try {
    for (const userId of userIds) {
      try {
        const user = await db.query.users.findFirst({
          where: eq(schema.users.id, userId)
        })

        if (!user) {
          failed.push({ userId, reason: 'User not found' })
          continue
        }

        if (user.role === 'admin' && adminSession.user.role !== 'superadmin') {
          failed.push({ userId, reason: 'Insufficient permissions for admin user' })
          continue
        }

        if (userId === adminSession.user.id) {
          failed.push({ userId, reason: 'Cannot perform operation on own account' })
          continue
        }

        switch (operation) {
          case 'activate':
            await auth.api.unbanUser({
              body: { userId: userId.toString() },
              headers: c.req.raw.headers,
            })
            
            await db
              .update(schema.users)
              .set({ isActive: true, updatedAt: new Date() })
              .where(eq(schema.users.id, userId))
            
            try {
              await sendAccountStatusEmail({
                email: user.email,
                name: user.name,
                status: 'activated',
                adminName: adminSession.user.name,
              })
            } catch (emailError) {
              console.error(`Failed to send activation email to ${user.email}:`, emailError)
            }
            break

          case 'deactivate':
            await auth.api.banUser({
              body: { 
                userId: userId.toString(),
                banReason: reason || 'Bulk deactivation by admin',
              },
              headers: c.req.raw.headers,
            })
            
            await db
              .update(schema.users)
              .set({ isActive: false, updatedAt: new Date() })
              .where(eq(schema.users.id, userId))
            
            try {
              await sendAccountStatusEmail({
                email: user.email,
                name: user.name,
                status: 'deactivated',
                adminName: adminSession.user.name,
              })
            } catch (emailError) {
              console.error(`Failed to send deactivation email to ${user.email}:`, emailError)
            }
            break

          case 'delete':
            if (adminSession.user.role !== 'superadmin') {
              failed.push({ userId, reason: 'Delete operation requires superadmin privileges' })
              continue
            }
            
            await auth.api.removeUser({
              body: { userId: userId.toString() },
              headers: c.req.raw.headers,
            })
            break

          case 'reset_password':
            const temporaryPassword = generateTemporaryPassword()
            
            await auth.api.setUserPassword({
              body: {
                newPassword: temporaryPassword,
                userId: userId.toString(),
              },
              headers: c.req.raw.headers,
            })
            
            await db
              .update(schema.users)
              .set({ mustChangePassword: true, updatedAt: new Date() })
              .where(eq(schema.users.id, userId))
            
            try {
              await sendAccountCreationEmail({
                email: user.email,
                inviterEmail: adminSession.user.email,
                organizationName: 'Budget Management System',
                inviteLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/sign-in`,
                temporaryPassword,
              })
            } catch (emailError) {
              console.error(`Failed to send password reset email to ${user.email}:`, emailError)
            }
            break

          default:
            failed.push({ userId, reason: 'Invalid operation' })
            continue
        }

        success.push(userId)
      } catch (operationError: any) {
        console.error(`Bulk operation failed for user ${userId}:`, operationError)
        failed.push({ userId, reason: operationError.message || 'Operation failed' })
      }
    }

    return c.json({
      success,
      failed,
      message: `Bulk ${operation} completed. ${success.length} succeeded, ${failed.length} failed.`,
    }, HttpStatusCodes.OK)

  } catch (error: any) {
    console.error('Bulk operations error:', error)
    throw new HTTPException(500, { message: 'Bulk operation failed' })
  }
}

// Get system statistics
export const getSystemStats: AppRouteHandler<GetSystemStatsRoute> = async (c) => {
  await checkAdminPermissions(c.req.raw.headers)

  try {
    // Get user statistics
    const userStats = await db
      .select({
        total: count(),
        role: schema.users.role,
        isActive: schema.users.isActive,
      })
      .from(schema.users)
      .groupBy(schema.users.role, schema.users.isActive)

    const userSummary = {
      total: 0,
      active: 0,
      inactive: 0,
      byRole: {} as Record<string, number>,
    }

    userStats.forEach(stat => {
      userSummary.total += stat.total
      if (stat.isActive) {
        userSummary.active += stat.total
      } else {
        userSummary.inactive += stat.total
      }
      userSummary.byRole[stat.role] = (userSummary.byRole[stat.role] || 0) + stat.total
    })

    // Get facility statistics
    const facilityStats = await db
      .select({
        total: count(),
        facilityType: schema.facilities.facilityType,
      })
      .from(schema.facilities)
      .groupBy(schema.facilities.facilityType)

    const facilitySummary = {
      total: 0,
      byType: {} as Record<string, number>,
    }

    facilityStats.forEach(stat => {
      facilitySummary.total += stat.total
      facilitySummary.byType[stat.facilityType] = stat.total
    })

    // Get project statistics
    const projectStats = await db
      .select({
        total: count(),
        projectType: schema.projects.projectType,
        status: schema.projects.status,
      })
      .from(schema.projects)
      .groupBy(schema.projects.projectType, schema.projects.status)

    const projectSummary = {
      total: 0,
      active: 0,
      byType: {} as Record<string, number>,
    }

    projectStats.forEach(stat => {
      projectSummary.total += stat.total
      if (stat.status === 'ACTIVE') {
        projectSummary.active += stat.total
      }
      if (stat.projectType) {
        projectSummary.byType[stat.projectType] = (projectSummary.byType[stat.projectType] || 0) + stat.total
      }
    })

    // Get recent activity from sessions
    const recentSessions = await db.query.session.findMany({
      limit: 10,
      orderBy: [desc(schema.session.createdAt)],
      with: {
        user: {
          columns: { name: true, email: true }
        }
      }
    })

    const recentActivity = recentSessions.map((session: any) => ({
      action: 'User Login',
      user: session.user?.name,
      timestamp: session.createdAt.toISOString(),
      details: `${session.user?.email} logged in`,
    }))

    return c.json({
      users: userSummary,
      facilities: facilitySummary,
      projects: projectSummary,
      recentActivity,
    }, HttpStatusCodes.OK)

  } catch (error: any) {
    console.error('Get system stats error:', error)
    throw new HTTPException(500, { message: 'Failed to retrieve system statistics' })
  }
}