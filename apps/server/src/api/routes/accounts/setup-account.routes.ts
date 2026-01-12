import { createRoute, z } from "@hono/zod-openapi"
import * as HttpStatusCodes from "stoker/http-status-codes"
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers"
import { errorSchema } from "./auth.types"

const tags = ["accounts"]

// Verify setup token route
export const verifySetupToken = createRoute({
  path: "/accounts/verify-setup-token",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(
      z.object({
        token: z.string().min(1, "Token is required"),
        email: z.string().email("Invalid email address"),
      }),
      "Token verification data"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        valid: z.boolean(),
        email: z.string().email(),
        message: z.string(),
      }),
      "Token is valid"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      errorSchema,
      "Invalid or expired token"
    ),
  },
});

// Setup account with password route
export const setupAccountPassword = createRoute({
  path: "/accounts/setup-password",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(
      z.object({
        token: z.string().min(1, "Token is required"),
        email: z.string().email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
      "Account setup data"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
      }),
      "Password set successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      errorSchema,
      "Invalid input or expired token"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      errorSchema,
      "User not found"
    ),
  },
});

export type VerifySetupToken = typeof verifySetupToken;
export type SetupAccountPassword = typeof setupAccountPassword;
