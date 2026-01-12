import { createRoute, z } from "@hono/zod-openapi"
import * as HttpStatusCodes from "stoker/http-status-codes"
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers"
import { errorSchema, authResponseSchema } from "./auth.types"


const tags = ["accounts"]

const banUserResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  user: z.object({
    id: z.union([z.string(), z.number()]),
    email: z.string(),
    banned: z.boolean(),
    banReason: z.string().nullable(),
    banExpires: z.string().nullable(),
  }),
});

export const banUser = createRoute({
  path: "/accounts/ban-user",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(
      z.object({
        userId: z.union([z.string(), z.number()]).transform((val) =>
          typeof val === 'string' ? parseInt(val, 10) : val
        ),
        banReason: z.string().min(1, "Ban reason is required"),
        banExpiresIn: z.number().optional().describe("Ban duration in seconds (optional for permanent ban)"),
        banExpiresAt: z.string().datetime().optional().describe("Specific ban expiration date (alternative to banExpiresIn)"),
      }).refine((data) => {
        // Either banExpiresIn or banExpiresAt can be provided, but not both
        if (data.banExpiresIn && data.banExpiresAt) {
          return false;
        }
        return true;
      }, "Cannot specify both banExpiresIn and banExpiresAt"),
      "User ban data"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      banUserResponseSchema,
      "User banned successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      errorSchema,
      "Invalid input data"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      errorSchema,
      "User not found"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions"
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      errorSchema,
      "User already banned"
    ),
  },
});

// Unban user route
export const unbanUser = createRoute({
  path: "/accounts/unban-user",
  method: "post",
  tags: ["User Management"],
  request: {
    body: jsonContentRequired(
      z.object({
        userId: z.union([z.string(), z.number()]).transform((val) =>
          typeof val === 'string' ? parseInt(val, 10) : val
        ),
        reason: z.string().optional().describe("Reason for unbanning (optional)"),
      }),
      "User unban data"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
        user: z.object({
          id: z.union([z.string(), z.number()]),
          email: z.string(),
          banned: z.boolean(),
          banReason: z.string().nullable(),
          banExpires: z.string().nullable(),
        }),
      }),
      "User unbanned successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      errorSchema,
      "Invalid input data"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      errorSchema,
      "User not found"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions"
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      errorSchema,
      "User not currently banned"
    ),
  },
});

// Update profile route
export const updateProfile = createRoute({
  path: "/accounts/profile",
  method: "put",
  tags,
  request: {
    body: jsonContentRequired(
      z.object({
        name: z.string().min(2, "Name must be at least 2 characters").optional(),
        email: z.email("Invalid email address").optional(),
        currentPassword: z.string().optional(),
        newPassword: z.string().min(8, "Password must be at least 8 characters").optional(),
      }),
      "Profile update data"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        user: authResponseSchema.shape.user,
        message: z.string(),
      }),
      "Profile updated successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      errorSchema,
      "Invalid input data"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      errorSchema,
      "Authentication required"
    ),
  },
});

// Get accessible facilities route
export const getAccessibleFacilities = createRoute({
  path: "/user/accessible-facilities",
  method: "get",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        facilityIds: z.array(z.number()),
        count: z.number(),
        role: z.string(),
        facilityType: z.string().nullable(),
        districtId: z.number().nullable(),
      }),
      "User's accessible facilities"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      errorSchema,
      "Not authenticated"
    ),
  },
})


// Export types for handlers
export type BanUser = typeof banUser;
export type UnbanUser = typeof unbanUser;
export type UpdateProfileRoute = typeof updateProfile
export type GetAccessibleFacilitiesRoute = typeof getAccessibleFacilities