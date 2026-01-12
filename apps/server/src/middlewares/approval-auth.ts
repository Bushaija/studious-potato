import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { permissionService, PermissionMatrix } from '@/lib/services/permission.service';

export interface ApprovalAuthOptions {
  requiredPermission: keyof PermissionMatrix;
  allowSelfAction?: boolean; // For actions like viewing own plans
}

/**
 * Middleware factory for role-based access control on approval endpoints
 * @param options - Configuration for the permission check
 * @returns Hono middleware function
 */
export function requireApprovalPermission(options: ApprovalAuthOptions) {
  return createMiddleware(async (c, next) => {
    try {
      // Check if user is authenticated (assumes auth middleware ran first)
      const user = c.get('user');
      if (!user || !user.id) {
        throw new HTTPException(401, {
          message: 'Authentication required',
        });
      }

      const userId = parseInt(user.id);
      const { requiredPermission } = options;

      // Validate user permission
      const permissionResult = await permissionService.validateUserPermission(
        userId,
        requiredPermission
      );

      if (!permissionResult.allowed) {
        throw new HTTPException(403, {
          message: permissionResult.reason || 'Insufficient permissions',
        });
      }

      // Add permission info to context for use in route handlers
      c.set('userPermissions', {
        validated: true,
        role: permissionResult.userRole,
        action: requiredPermission
      });

      await next();

    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      console.error('Error in approval permission middleware:', error);
      throw new HTTPException(500, {
        message: 'Internal server error during permission validation',
      });
    }
  });
}

/**
 * Middleware specifically for approval actions (approve/reject)
 * Includes cross-role interaction validation
 */
export function requireApprovalAction() {
  return createMiddleware(async (c, next) => {
    try {
      // Check if user is authenticated
      const user = c.get('user');
      if (!user || !user.id) {
        throw new HTTPException(401, {
          message: 'Authentication required',
        });
      }

      const userId = parseInt(user.id);

      // Validate basic approval permission
      const permissionResult = await permissionService.validateApprovalPermission(userId);
      if (!permissionResult.allowed) {
        throw new HTTPException(403, {
          message: permissionResult.reason || 'Insufficient permissions for approval actions',
        });
      }

      // Add permission info to context
      c.set('userPermissions', {
        validated: true,
        role: permissionResult.userRole,
        action: 'approvePlan'
      });

      await next();

    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      console.error('Error in approval action middleware:', error);
      throw new HTTPException(500, {
        message: 'Internal server error during approval validation',
      });
    }
  });
}

/**
 * Middleware for bulk approval operations
 */
export function requireBulkApprovalPermission() {
  return createMiddleware(async (c, next) => {
    try {
      // Check if user is authenticated
      const user = c.get('user');
      if (!user || !user.id) {
        throw new HTTPException(401, {
          message: 'Authentication required',
        });
      }

      const userId = parseInt(user.id);
      const body = await c.req.json();
      const { planningIds } = body;

      // Validate bulk approval permission
      const permissionResult = await permissionService.validateBulkApprovalPermission(
        userId,
        planningIds || []
      );

      if (!permissionResult.allowed) {
        throw new HTTPException(403, {
          message: permissionResult.reason || 'Insufficient permissions for bulk approval',
        });
      }

      // Add permission info to context
      c.set('userPermissions', {
        validated: true,
        role: permissionResult.userRole,
        action: 'bulkApprove'
      });

      await next();

    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      console.error('Error in bulk approval permission middleware:', error);
      throw new HTTPException(500, {
        message: 'Internal server error during bulk approval validation',
      });
    }
  });
}

/**
 * Middleware for audit trail access
 */
export function requireAuditViewPermission() {
  return requireApprovalPermission({
    requiredPermission: 'viewAudit'
  });
}

/**
 * Middleware for plan creation
 */
export function requirePlanCreationPermission() {
  return requireApprovalPermission({
    requiredPermission: 'createPlan'
  });
}

/**
 * Middleware for plan execution validation
 * This will be used on execution endpoints to ensure only approved plans are executed
 */
export function requireExecutionPermission() {
  return createMiddleware(async (c, next) => {
    try {
      // Check if user is authenticated
      const user = c.get('user');
      if (!user || !user.id) {
        throw new HTTPException(401, {
          message: 'Authentication required',
        });
      }

      const userId = parseInt(user.id);

      // Validate execution permission
      const permissionResult = await permissionService.validateUserPermission(
        userId,
        'executePlan'
      );

      if (!permissionResult.allowed) {
        throw new HTTPException(403, {
          message: permissionResult.reason || 'Insufficient permissions for plan execution',
        });
      }

      // Add permission info to context
      c.set('userPermissions', {
        validated: true,
        role: permissionResult.userRole,
        action: 'executePlan'
      });

      await next();

    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      console.error('Error in execution permission middleware:', error);
      throw new HTTPException(500, {
        message: 'Internal server error during execution validation',
      });
    }
  });
}

/**
 * Utility function to check permissions in route handlers
 * @param c - Hono context object
 * @param permission - Permission to check
 * @returns Boolean indicating if user has permission
 */
export async function hasPermission(
  c: any,
  permission: keyof PermissionMatrix
): Promise<boolean> {
  const user = c.get('user');
  if (!user || !user.id) {
    return false;
  }

  const result = await permissionService.validateUserPermission(
    parseInt(user.id),
    permission
  );

  return result.allowed;
}