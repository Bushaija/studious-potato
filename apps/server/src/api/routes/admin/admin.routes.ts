// src/api/routes/admin/admin.routes.ts

import { createRoute, z } from "@hono/zod-openapi"
import * as HttpStatusCodes from "stoker/http-status-codes"
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers"
import { userSchema, errorSchema } from "./admin.types"

const tags = ["admin"]

// Create user account
export const createUserAccount = createRoute({
  path: "/admin/users",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(
      z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.email({ message: 'This is not a valid email.' }),
        role: z.enum(['accountant', 'program_manager', 'daf', 'dg']).default('accountant'),
        facilityId: z.number().optional(),
        permissions: z.record(z.string(), z.any()).optional(),
        projectAccess: z.array(z.number()).optional(),
        sendWelcomeEmail: z.boolean().default(true),
      }),
      "User creation data"
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      z.object({
        user: userSchema,
        temporaryPassword: z.string(),
        message: z.string(),
      }),
      "User created successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      errorSchema,
      "Invalid input data"
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      errorSchema,
      "User already exists"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions"
    ),
  },
})

// Get all users
export const getUsers = createRoute({
  path: "/admin/users",
  method: "get",
  tags,
  request: {
    query: z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
      role: z.enum(['accountant', 'admin', 'program_manager', 'daf', 'dg']).optional(),
      facilityId: z.string().optional(),
      isActive: z.enum(['true', 'false']).optional(),
      banned: z.enum(['true', 'false']).optional(),
      search: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        users: z.array(userSchema.extend({
          facilityName: z.string().nullable(),
        })),
        pagination: z.object({
          page: z.number(),
          limit: z.number(),
          total: z.number(),
          totalPages: z.number(),
        }),
        filters: z.object({
          role: z.string().nullable(),
          banned: z.string().nullable(),
          isActive: z.string().nullable(),
          facilityId: z.string().nullable(),
        }),
      }),
      "Users list"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions"
    ),
  },
})

// Get single user
export const getUser = createRoute({
  path: "/admin/users/{userId}",
  method: "get",
  tags,
  request: {
    params: z.object({
      userId: z.string().transform(Number),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      userSchema,
      "User details"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      errorSchema,
      "User not found"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions"
    ),
  },
})

// Update user
export const updateUser = createRoute({
  path: "/admin/users/{userId}",
  method: "put",
  tags,
  request: {
    params: z.object({
      userId: z.string().transform(Number),
    }),
    body: jsonContentRequired(
      z.object({
        name: z.string().min(2).optional(),
        email: z.string().email().optional(),
        role: z.enum(['admin', 'accountant', 'program_manager', 'daf', 'dg', 'superadmin']).optional(),
        facilityId: z.number().nullable().optional(),
        permissions: z.array(z.string()).optional(),
        projectAccess: z.array(z.number()).optional(),
        isActive: z.boolean().optional(),
        mustChangePassword: z.boolean().optional(),
      }),
      "User update data"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      userSchema,
      "User updated successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      errorSchema,
      "User not found"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      errorSchema,
      "Invalid input data"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions"
    ),
  },
})

// Activate/Deactivate user
export const toggleUserStatus = createRoute({
  path: "/admin/users/{userId}/status",
  method: "patch",
  tags,
  request: {
    params: z.object({
      userId: z.string().transform(Number),
    }),
    body: jsonContentRequired(
      z.object({
        isActive: z.boolean(),
        reason: z.string().optional(),
      }),
      "User status change"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        user: userSchema,
        message: z.string(),
      }),
      "User status updated"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      errorSchema,
      "User not found"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions"
    ),
  },
})

// Reset user password
export const resetUserPassword = createRoute({
  path: "/admin/users/{userId}/reset-password",
  method: "post",
  tags,
  request: {
    params: z.object({
      userId: z.string().transform(Number),
    }),
    body: jsonContentRequired(
      z.object({
        sendEmail: z.boolean().default(true),
      }),
      "Password reset options"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        temporaryPassword: z.string(),
        message: z.string(),
      }),
      "Password reset successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      errorSchema,
      "User not found"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions"
    ),
  },
})

// Delete user
export const deleteUser = createRoute({
  path: "/admin/users/{userId}",
  method: "delete",
  tags,
  request: {
    params: z.object({
      userId: z.string().transform(Number),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        message: z.string(),
      }),
      "User deleted successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      errorSchema,
      "User not found"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions"
    ),
  },
})

// Get user activity logs
export const getUserActivityLogs = createRoute({
  path: "/admin/users/{userId}/activity",
  method: "get",
  tags,
  request: {
    params: z.object({
      userId: z.string().transform(Number),
    }),
    query: z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        logs: z.array(z.object({
          id: z.number(),
          action: z.string(),
          details: z.record(z.string(), z.any()).nullable(),
          createdAt: z.string(),
          ipAddress: z.string().nullable(),
          userAgent: z.string().nullable(),
        })),
        pagination: z.object({
          page: z.number(),
          limit: z.number(),
          total: z.number(),
          totalPages: z.number(),
        }),
      }),
      "User activity logs"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      errorSchema,
      "User not found"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions"
    ),
  },
})

// Bulk operations
export const bulkUserOperations = createRoute({
  path: "/admin/users/bulk",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(
      z.object({
        operation: z.enum(['activate', 'deactivate', 'delete', 'reset_password']),
        userIds: z.array(z.number()).min(1),
        reason: z.string().optional(),
      }),
      "Bulk operation data"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.array(z.number()),
        failed: z.array(z.object({
          userId: z.number(),
          reason: z.string(),
        })),
        message: z.string(),
      }),
      "Bulk operation completed"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      errorSchema,
      "Invalid operation"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions"
    ),
  },
})

// System statistics
export const getSystemStats = createRoute({
  path: "/admin/stats",
  method: "get",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        users: z.object({
          total: z.number(),
          active: z.number(),
          inactive: z.number(),
          byRole: z.record(z.string(), z.number()),
        }),
        facilities: z.object({
          total: z.number(),
          byType: z.record(z.string(), z.number()),
        }),
        projects: z.object({
          total: z.number(),
          active: z.number(),
          byType: z.record(z.string(), z.number()),
        }),
        recentActivity: z.array(z.object({
          action: z.string(),
          user: z.string(),
          timestamp: z.string(),
          details: z.string().optional(),
        })),
      }),
      "System statistics"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions"
    ),
  },
})

// Export route types for handlers
export type CreateUserAccountRoute = typeof createUserAccount
export type GetUsersRoute = typeof getUsers
export type GetUserRoute = typeof getUser
export type UpdateUserRoute = typeof updateUser
export type ToggleUserStatusRoute = typeof toggleUserStatus
export type ResetUserPasswordRoute = typeof resetUserPassword
export type DeleteUserRoute = typeof deleteUser

export type GetUserActivityLogsRoute = typeof getUserActivityLogs
export type BulkUserOperationsRoute = typeof bulkUserOperations
export type GetSystemStatsRoute = typeof getSystemStats