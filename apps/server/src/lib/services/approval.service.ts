import { db } from "@/db";
import { schemaFormDataEntries } from "@/db/schema/schema-form-data-entries/schema";
import { users } from "@/db/schema/users/schema";
import { eq } from "drizzle-orm";
import { notificationService } from "./notification.service";
import { auditService } from "./audit.service";
import { ApprovalError, ApprovalErrorFactory } from "@/lib/errors/approval.errors";

export interface ApprovalRequest {
  planningId: number;
  action: 'APPROVE' | 'REJECT';
  comments?: string;
}

export interface ApprovalResult {
  success: boolean;
  message: string;
  record: {
    id: number;
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT' | null;
    reviewedBy: number | null;
    reviewedByName: string | null;
    reviewedAt: string | null;
    reviewComments: string | null;
  };
}

export interface ExecutionPermissionResult {
  allowed: boolean;
  reason?: string;
  planningId: number;
  currentStatus: string;
}

export class ApprovalService {
  /**
   * Calculates the total budget from a plan's formData
   * @param formData - The formData object containing activities with budgets
   * @returns Total budget amount, or 0 if formData is missing or malformed
   * @private
   */
  private calculatePlanBudget(formData: any): number {
    try {
      if (!formData?.activities) {
        console.warn('FormData missing activities field, returning budget as 0');
        return 0;
      }

      const activities = Object.values(formData.activities);
      const totalBudget = activities.reduce((sum: number, activity: any) => {
        return sum + (activity?.total_budget || 0);
      }, 0);

      return totalBudget;
    } catch (error) {
      console.warn('Error calculating plan budget, returning 0:', error);
      return 0;
    }
  }

  /**
   * Approves a plan with status validation and user permission checks
   * @param planningId - The ID of the plan to approve
   * @param adminId - The ID of the admin user performing the approval
   * @param comments - Optional comments for the approval
   * @returns ApprovalResult with success status and updated record
   * @throws ApprovalError for validation failures and permission issues
   */
  async approvePlan(planningId: number, adminId: number, comments?: string): Promise<ApprovalResult> {
    try {
      // Validate plan exists and is in PENDING status
      const plan = await db.query.schemaFormDataEntries.findFirst({
        where: eq(schemaFormDataEntries.id, planningId)
      });

      if (!plan) {
        throw ApprovalErrorFactory.planNotFound(planningId);
      }

      // Validate current status allows approval
      if (plan.approvalStatus !== 'PENDING') {
        throw ApprovalErrorFactory.invalidStatusTransition(
          planningId,
          plan.approvalStatus || 'UNKNOWN',
          'APPROVE'
        );
      }

      // Validate admin user exists and has approval permissions
      const adminUser = await db.query.users.findFirst({
        where: eq(users.id, adminId)
      });

      if (!adminUser) {
        throw ApprovalErrorFactory.userNotFound(adminId);
      }

      // Check if user has approval permissions (admin, superadmin)
      if (!['admin', 'superadmin'].includes(adminUser.role)) {
        throw ApprovalErrorFactory.insufficientPermissions(
          adminId,
          adminUser.role,
          ['admin', 'superadmin']
        );
      }

      // Calculate budget amount before approval
      const budgetAmount = this.calculatePlanBudget(plan.formData);

      // Update plan status to APPROVED
      const updatedPlan = await db.update(schemaFormDataEntries)
        .set({
          approvalStatus: 'APPROVED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewComments: comments || null,
          updatedBy: adminId,
          updatedAt: new Date()
        })
        .where(eq(schemaFormDataEntries.id, planningId))
        .returning();

      if (updatedPlan.length === 0) {
        throw ApprovalErrorFactory.databaseError('plan status update');
      }

      const updated = updatedPlan[0];

      // Log to audit with budget information
      try {
        await auditService.logApprovalAction(
          planningId,
          plan.approvalStatus,
          'APPROVED',
          adminId,
          comments,
          { budgetAmount }
        );
      } catch (auditError) {
        console.error('Failed to log approval to audit:', auditError);
        // Don't fail the approval if audit logging fails
      }
      
      // Send notification to planner about approval decision
      try {
        if (plan.createdBy) {
          await notificationService.notifyApprovalDecision(
            planningId, 
            plan.createdBy, 
            'APPROVED'
          );
        }
      } catch (notificationError) {
        console.error('Failed to send approval notification:', notificationError);
        // Don't fail the approval if notification fails
      }
      
      return {
        success: true,
        message: 'Plan approved successfully',
        record: {
          id: updated.id,
          approvalStatus: updated.approvalStatus,
          reviewedBy: updated.reviewedBy,
          reviewedByName: adminUser.name,
          reviewedAt: updated.reviewedAt?.toISOString() || null,
          reviewComments: updated.reviewComments
        }
      };

    } catch (error) {
      // Re-throw ApprovalErrors as-is
      if (error instanceof ApprovalError) {
        throw error;
      }
      
      // Wrap other errors in ApprovalError
      console.error('Error approving plan:', error);
      throw ApprovalErrorFactory.validationError(
        `Failed to approve plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
        planningId
      );
    }
  }

  /**
   * Rejects a plan with required comments validation
   * @param planningId - The ID of the plan to reject
   * @param adminId - The ID of the admin user performing the rejection
   * @param comments - Required comments explaining the rejection
   * @returns ApprovalResult with success status and updated record
   * @throws ApprovalError for validation failures and permission issues
   */
  async rejectPlan(planningId: number, adminId: number, comments: string): Promise<ApprovalResult> {
    try {
      // Validate comments are provided for rejection
      if (!comments || comments.trim().length === 0) {
        throw ApprovalErrorFactory.commentsRequired(planningId, 'REJECT');
      }

      // Validate plan exists and is in PENDING status
      const plan = await db.query.schemaFormDataEntries.findFirst({
        where: eq(schemaFormDataEntries.id, planningId)
      });

      if (!plan) {
        throw ApprovalErrorFactory.planNotFound(planningId);
      }

      // Validate current status allows rejection
      if (plan.approvalStatus !== 'PENDING') {
        throw ApprovalErrorFactory.invalidStatusTransition(
          planningId,
          plan.approvalStatus || 'UNKNOWN',
          'REJECT'
        );
      }

      // Validate admin user exists and has approval permissions
      const adminUser = await db.query.users.findFirst({
        where: eq(users.id, adminId)
      });

      if (!adminUser) {
        throw ApprovalErrorFactory.userNotFound(adminId);
      }

      // Check if user has approval permissions (admin, superadmin)
      if (!['admin', 'superadmin'].includes(adminUser.role)) {
        throw ApprovalErrorFactory.insufficientPermissions(
          adminId,
          adminUser.role,
          ['admin', 'superadmin']
        );
      }

      // Calculate budget amount before rejection
      const budgetAmount = this.calculatePlanBudget(plan.formData);

      // Update plan status to REJECTED
      const updatedPlan = await db.update(schemaFormDataEntries)
        .set({
          approvalStatus: 'REJECTED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewComments: comments.trim(),
          updatedBy: adminId,
          updatedAt: new Date()
        })
        .where(eq(schemaFormDataEntries.id, planningId))
        .returning();

      if (updatedPlan.length === 0) {
        throw ApprovalErrorFactory.databaseError('plan status update');
      }

      const updated = updatedPlan[0];

      // Log to audit with budget information
      try {
        await auditService.logApprovalAction(
          planningId,
          plan.approvalStatus,
          'REJECTED',
          adminId,
          comments.trim(),
          { budgetAmount }
        );
      } catch (auditError) {
        console.error('Failed to log rejection to audit:', auditError);
        // Don't fail the rejection if audit logging fails
      }
      
      // Send notification to planner about rejection decision
      try {
        if (plan.createdBy) {
          await notificationService.notifyApprovalDecision(
            planningId, 
            plan.createdBy, 
            'REJECTED'
          );
        }
      } catch (notificationError) {
        console.error('Failed to send rejection notification:', notificationError);
        // Don't fail the rejection if notification fails
      }
      
      return {
        success: true,
        message: 'Plan rejected successfully',
        record: {
          id: updated.id,
          approvalStatus: updated.approvalStatus,
          reviewedBy: updated.reviewedBy,
          reviewedByName: adminUser.name,
          reviewedAt: updated.reviewedAt?.toISOString() || null,
          reviewComments: updated.reviewComments
        }
      };

    } catch (error) {
      // Re-throw ApprovalErrors as-is
      if (error instanceof ApprovalError) {
        throw error;
      }
      
      // Wrap other errors in ApprovalError
      console.error('Error rejecting plan:', error);
      throw ApprovalErrorFactory.validationError(
        `Failed to reject plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
        planningId
      );
    }
  }

  /**
   * Validates if a plan has execution permission (is approved)
   * @param planningId - The ID of the plan to validate
   * @returns ExecutionPermissionResult indicating if execution is allowed
   * @throws ApprovalError for plan not found or validation errors
   */
  async validateExecutionPermission(planningId: number): Promise<ExecutionPermissionResult> {
    try {
      // Find the plan
      const plan = await db.query.schemaFormDataEntries.findFirst({
        where: eq(schemaFormDataEntries.id, planningId)
      });

      if (!plan) {
        throw ApprovalErrorFactory.planNotFound(planningId);
      }

      // Check if plan is approved
      if (plan.approvalStatus !== 'APPROVED') {
        return {
          allowed: false,
          reason: `Plan has not been approved for execution. Current status: ${plan.approvalStatus}`,
          planningId,
          currentStatus: plan.approvalStatus || 'UNKNOWN'
        };
      }

      return {
        allowed: true,
        planningId,
        currentStatus: plan.approvalStatus || 'UNKNOWN'
      };

    } catch (error) {
      // Re-throw ApprovalErrors as-is
      if (error instanceof ApprovalError) {
        throw error;
      }
      
      // Wrap other errors in ApprovalError
      console.error('Error validating execution permission:', error);
      throw ApprovalErrorFactory.validationError(
        `Failed to validate execution permission: ${error instanceof Error ? error.message : 'Unknown error'}`,
        planningId
      );
    }
  }
}

// Export singleton instance
export const approvalService = new ApprovalService();