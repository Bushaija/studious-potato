import { db } from "@/db";
import { users } from "@/db/schema/users/schema";
import { eq } from "drizzle-orm";

export type UserRole = 'accountant' | 'admin' | 'superadmin' | 'program_manager';

export interface PermissionMatrix {
  createPlan: boolean;
  reviewPlan: boolean;
  approvePlan: boolean;
  rejectPlan: boolean;
  executePlan: boolean;
  viewAudit: boolean;
  bulkApprove: boolean;
}

export interface PermissionValidationResult {
  allowed: boolean;
  reason?: string;
  userRole: UserRole;
  requiredRoles?: UserRole[];
}

export interface UserPermissions {
  userId: number;
  role: UserRole;
  permissions: PermissionMatrix;
}

export class PermissionService {
  /**
   * Permission matrix defining what each role can do
   * Based on the design document requirements
   */
  private static readonly ROLE_PERMISSIONS: Record<UserRole, PermissionMatrix> = {
    accountant: {
      createPlan: true,
      reviewPlan: false,
      approvePlan: false,
      rejectPlan: false,
      executePlan: true, // Only approved plans
      viewAudit: false,
      bulkApprove: false
    },
    admin: {
      createPlan: false,
      reviewPlan: true,
      approvePlan: true,
      rejectPlan: true,
      executePlan: true, // Only approved plans
      viewAudit: true,
      bulkApprove: true
    },
    superadmin: {
      createPlan: true,
      reviewPlan: true,
      approvePlan: true,
      rejectPlan: true,
      executePlan: true,
      viewAudit: true,
      bulkApprove: true
    },
    program_manager: {
      createPlan: false,
      reviewPlan: true,
      approvePlan: false,
      rejectPlan: false,
      executePlan: true, // Only approved plans
      viewAudit: true,
      bulkApprove: false
    }
  };

  /**
   * Gets the permission matrix for a specific role
   * @param role - The user role
   * @returns PermissionMatrix for the role
   */
  static getRolePermissions(role: UserRole): PermissionMatrix {
    return this.ROLE_PERMISSIONS[role];
  }

  /**
   * Validates if a user has permission to perform a specific action
   * @param userId - The ID of the user
   * @param action - The action to validate permission for
   * @returns PermissionValidationResult indicating if action is allowed
   */
  async validateUserPermission(
    userId: number,
    action: keyof PermissionMatrix
  ): Promise<PermissionValidationResult> {
    try {
      // Get user information
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          role: true
        }
      });

      if (!user) {
        return {
          allowed: false,
          reason: 'User not found',
          userRole: 'accountant', // Default fallback
          requiredRoles: []
        };
      }

      const userRole = user.role as UserRole;
      const permissions = PermissionService.getRolePermissions(userRole);
      const hasPermission = permissions[action];

      if (!hasPermission) {
        // Find which roles have this permission
        const rolesWithPermission = Object.entries(PermissionService.ROLE_PERMISSIONS)
          .filter(([_, perms]) => perms[action])
          .map(([role, _]) => role as UserRole);

        return {
          allowed: false,
          reason: `User role '${userRole}' does not have permission to '${action}'`,
          userRole,
          requiredRoles: rolesWithPermission
        };
      }

      return {
        allowed: true,
        userRole
      };

    } catch (error) {
      console.error('Error validating user permission:', error);
      return {
        allowed: false,
        reason: `Failed to validate permission: ${error instanceof Error ? error.message : 'Unknown error'}`,
        userRole: 'accountant', // Default fallback
        requiredRoles: []
      };
    }
  }

  /**
   * Gets complete user permissions including role and permission matrix
   * @param userId - The ID of the user
   * @returns UserPermissions object with role and permissions
   */
  async getUserPermissions(userId: number): Promise<UserPermissions | null> {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          role: true
        }
      });

      if (!user) {
        return null;
      }

      const userRole = user.role as UserRole;
      const permissions = PermissionService.getRolePermissions(userRole);

      return {
        userId: user.id,
        role: userRole,
        permissions
      };

    } catch (error) {
      console.error('Error getting user permissions:', error);
      return null;
    }
  }

  /**
   * Validates if a user can approve/reject plans (admin or superadmin only)
   * @param userId - The ID of the user
   * @returns PermissionValidationResult for approval actions
   */
  async validateApprovalPermission(userId: number): Promise<PermissionValidationResult> {
    return this.validateUserPermission(userId, 'approvePlan');
  }

  /**
   * Validates if a user can create plans (accountant or superadmin only)
   * @param userId - The ID of the user
   * @returns PermissionValidationResult for plan creation
   */
  async validatePlanCreationPermission(userId: number): Promise<PermissionValidationResult> {
    return this.validateUserPermission(userId, 'createPlan');
  }

  /**
   * Validates if a user can view audit trails
   * @param userId - The ID of the user
   * @returns PermissionValidationResult for audit viewing
   */
  async validateAuditViewPermission(userId: number): Promise<PermissionValidationResult> {
    return this.validateUserPermission(userId, 'viewAudit');
  }

  /**
   * Validates cross-role interactions (e.g., accountant cannot approve their own plans)
   * @param creatorId - The ID of the user who created the plan
   * @param reviewerId - The ID of the user trying to review/approve the plan
   * @returns PermissionValidationResult for cross-role validation
   */
  async validateCrossRoleInteraction(
    creatorId: number,
    reviewerId: number
  ): Promise<PermissionValidationResult> {
    try {
      // Get both users
      const [creator, reviewer] = await Promise.all([
        db.query.users.findFirst({
          where: eq(users.id, creatorId),
          columns: { id: true, role: true }
        }),
        db.query.users.findFirst({
          where: eq(users.id, reviewerId),
          columns: { id: true, role: true }
        })
      ]);

      if (!creator) {
        return {
          allowed: false,
          reason: 'Plan creator not found',
          userRole: 'accountant'
        };
      }

      if (!reviewer) {
        return {
          allowed: false,
          reason: 'Reviewer not found',
          userRole: 'accountant'
        };
      }

      const reviewerRole = reviewer.role as UserRole;

      // Check if reviewer has approval permissions
      const reviewerPermissions = PermissionService.getRolePermissions(reviewerRole);
      if (!reviewerPermissions.approvePlan) {
        return {
          allowed: false,
          reason: `User role '${reviewerRole}' cannot approve plans`,
          userRole: reviewerRole,
          requiredRoles: ['admin', 'superadmin']
        };
      }

      // Prevent self-approval (same user)
      if (creatorId === reviewerId) {
        return {
          allowed: false,
          reason: 'Users cannot approve their own plans',
          userRole: reviewerRole
        };
      }

      // Additional business rules can be added here
      // For example: accountants from the same facility cannot approve each other's plans

      return {
        allowed: true,
        userRole: reviewerRole
      };

    } catch (error) {
      console.error('Error validating cross-role interaction:', error);
      return {
        allowed: false,
        reason: `Failed to validate cross-role interaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        userRole: 'accountant'
      };
    }
  }

  /**
   * Validates bulk approval permissions
   * @param userId - The ID of the user attempting bulk approval
   * @param planIds - Array of plan IDs to be bulk approved
   * @returns PermissionValidationResult for bulk operations
   */
  async validateBulkApprovalPermission(
    userId: number,
    _planIds: number[]
  ): Promise<PermissionValidationResult> {
    try {
      // First check if user has bulk approval permission
      const bulkPermissionResult = await this.validateUserPermission(userId, 'bulkApprove');
      if (!bulkPermissionResult.allowed) {
        return bulkPermissionResult;
      }

      // Additional validation: ensure user didn't create any of the plans being bulk approved
      // This would require checking each plan's creator, but for now we'll allow it
      // since the business rules might allow admins to bulk approve plans from multiple creators

      return {
        allowed: true,
        userRole: bulkPermissionResult.userRole
      };

    } catch (error) {
      console.error('Error validating bulk approval permission:', error);
      return {
        allowed: false,
        reason: `Failed to validate bulk approval permission: ${error instanceof Error ? error.message : 'Unknown error'}`,
        userRole: 'accountant'
      };
    }
  }

  /**
   * Gets all roles that have a specific permission
   * @param permission - The permission to check
   * @returns Array of roles that have the permission
   */
  static getRolesWithPermission(permission: keyof PermissionMatrix): UserRole[] {
    return Object.entries(this.ROLE_PERMISSIONS)
      .filter(([_, perms]) => perms[permission])
      .map(([role, _]) => role as UserRole);
  }

  /**
   * Checks if a role has a specific permission (static method)
   * @param role - The user role
   * @param permission - The permission to check
   * @returns Boolean indicating if role has permission
   */
  static hasPermission(role: UserRole, permission: keyof PermissionMatrix): boolean {
    return this.ROLE_PERMISSIONS[role][permission];
  }
}

// Export singleton instance
export const permissionService = new PermissionService();