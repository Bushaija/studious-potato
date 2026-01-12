import { eq, and, gt } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import * as HttpStatusCodes from "stoker/http-status-codes"

import { db } from '@/api/db'
import * as schema from '@/api/db/schema'
import type { AppRouteHandler } from "@/api/lib/types"
import type {
  VerifySetupToken,
  SetupAccountPassword,
} from "./setup-account.routes"

// Verify setup token handler
export const verifySetupToken: AppRouteHandler<VerifySetupToken> = async (c) => {
  const { token, email } = await c.req.json();

  try {
    // Find the verification token
    const verification = await db.query.verification.findFirst({
      where: and(
        eq(schema.verification.identifier, email),
        eq(schema.verification.value, token),
        gt(schema.verification.expiresAt, new Date())
      ),
    });

    if (!verification) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
        message: 'Invalid or expired token',
      });
    }

    // Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (!user) {
      throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
        message: 'User not found',
      });
    }

    return c.json({
      valid: true,
      email: user.email,
      message: 'Token is valid',
    }, HttpStatusCodes.OK);

  } catch (error: any) {
    console.error('Verify setup token error:', error);
    
    if (error instanceof HTTPException) {
      throw error;
    }

    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: error.message || 'Failed to verify token',
    });
  }
};

// Setup account password handler
export const setupAccountPassword: AppRouteHandler<SetupAccountPassword> = async (c) => {
  const { token, email, password } = await c.req.json();

  try {
    console.log(`[Setup Password] Attempting to setup password for email: ${email}`);
    console.log(`[Setup Password] Token type: ${token.startsWith('eyJ') ? 'JWT' : 'Plain'}`);
    
    // Use Better Auth's resetPassword API to handle the token validation and password reset
    const { auth } = await import('@/lib/auth_');
    
    try {
      await auth.api.resetPassword({
        body: {
          newPassword: password,
          token: token,
        },
      });
      
      console.log(`[Setup Password] Password reset successful via Better Auth for ${email}`);
    } catch (authError: any) {
      console.error(`[Setup Password] Better Auth reset failed:`, authError);
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
        message: authError.message || 'Invalid or expired token.',
      });
    }

    // Find the user and update flags
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (!user) {
      throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
        message: 'User not found',
      });
    }

    // Update user flags (Better Auth already updated the password)
    await db
      .update(schema.users)
      .set({
        mustChangePassword: false,
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));

    console.log(`[Setup Account] Password set successfully for user: ${email}`);

    return c.json({
      success: true,
      message: 'Password set successfully. You can now sign in.',
    }, HttpStatusCodes.OK);

  } catch (error: any) {
    console.error('Setup account password error:', error);
    
    if (error instanceof HTTPException) {
      throw error;
    }

    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: error.message || 'Failed to set password',
    });
  }
};
