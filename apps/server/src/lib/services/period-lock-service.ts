import { db } from "@/db";
import { periodLocks } from "@/db/schema/period-locks/schema";
import { periodLockAuditLog } from "@/db/schema/period-lock-audit-log/schema";
import { users } from "@/db/schema/users/schema";
import { eq, and } from "drizzle-orm";

/**
 * Period Lock Validation Result
 * Contains whether an edit operation is allowed and reason if not
 */
export interface PeriodLockValidationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Period Lock with Relations
 * Extended period lock data with related entities
 */
export interface PeriodLockWithRelations {
  id: number;
  reportingPeriodId: number;
  projectId: number;
  facilityId: number;
  isLocked: boolean;
  lockedBy: number | null;
  lockedAt: Date | null;
  lockedReason: string | null;
  unlockedBy: number | null;
  unlockedAt: Date | null;
  unlockedReason: string | null;
  reportingPeriod?: any;
  project?: any;
  facility?: any;
  lockedByUser?: any;
  unlockedByUser?: any;
}

/**
 * PeriodLockService
 * Handles period locking, unlocking, validation, and audit logging
 * for financial reporting periods
 */
export class PeriodLockService {
  /**
   * Lock a reporting period
   * Creates or updates a period lock when a report is approved
   * 
   * @param reportingPeriodId - Reporting period ID
   * @param projectId - Project ID
   * @param facilityId - Facility ID
   * @param userId - User ID who triggered the lock
   * @param reason - Reason for locking (e.g., "Report fully approved")
   */
  async lockPeriod(
    reportingPeriodId: number,
    projectId: number,
    facilityId: number,
    userId: number,
    reason: string
  ): Promise<void> {
    try {
      // Check if lock already exists
      const existingLock = await db.query.periodLocks.findFirst({
        where: and(
          eq(periodLocks.reportingPeriodId, reportingPeriodId),
          eq(periodLocks.projectId, projectId),
          eq(periodLocks.facilityId, facilityId)
        ),
      });

      if (existingLock) {
        // Update existing lock
        await db.update(periodLocks)
          .set({
            isLocked: true,
            lockedBy: userId,
            lockedAt: new Date(),
            lockedReason: reason,
          })
          .where(eq(periodLocks.id, existingLock.id));

        // Log the action
        await this.logLockAction(existingLock.id, "LOCKED", userId, reason);
        
        console.log(
          `Period lock updated: period=${reportingPeriodId}, ` +
          `project=${projectId}, facility=${facilityId}`
        );
      } else {
        // Create new lock
        const [newLock] = await db.insert(periodLocks).values({
          reportingPeriodId,
          projectId,
          facilityId,
          isLocked: true,
          lockedBy: userId,
          lockedReason: reason,
        }).returning();

        // Log the action
        await this.logLockAction(newLock.id, "LOCKED", userId, reason);
        
        console.log(
          `Period lock created: period=${reportingPeriodId}, ` +
          `project=${projectId}, facility=${facilityId}`
        );
      }
    } catch (error) {
      console.error('Error locking period:', error);
      throw new Error(
        `Failed to lock period: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Unlock a reporting period (admin only)
   * Allows administrators to unlock a period for corrections
   * 
   * @param lockId - Period lock ID
   * @param userId - User ID performing the unlock
   * @param reason - Reason for unlocking (required for audit)
   */
  async unlockPeriod(
    lockId: number,
    userId: number,
    reason: string
  ): Promise<void> {
    try {
      // Verify user has admin permissions
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      const hasAdminPermission = user.role === 'admin' || 
                                 user.role === 'superadmin';

      if (!hasAdminPermission) {
        throw new Error(
          `User ${userId} does not have permission to unlock periods. ` +
          `Admin or superadmin role required.`
        );
      }

      // Update the lock
      await db.update(periodLocks)
        .set({
          isLocked: false,
          unlockedBy: userId,
          unlockedAt: new Date(),
          unlockedReason: reason,
        })
        .where(eq(periodLocks.id, lockId));

      // Log the action
      await this.logLockAction(lockId, "UNLOCKED", userId, reason);
      
      console.log(`Period lock ${lockId} unlocked by user ${userId}`);
    } catch (error) {
      console.error('Error unlocking period:', error);
      throw new Error(
        `Failed to unlock period: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if a period is locked
   * Returns true if an active lock exists for the period/project/facility combination
   * 
   * @param reportingPeriodId - Reporting period ID
   * @param projectId - Project ID
   * @param facilityId - Facility ID
   * @returns True if period is locked, false otherwise
   */
  async isPeriodLocked(
    reportingPeriodId: number,
    projectId: number,
    facilityId: number
  ): Promise<boolean> {
    try {
      const lock = await db.query.periodLocks.findFirst({
        where: and(
          eq(periodLocks.reportingPeriodId, reportingPeriodId),
          eq(periodLocks.projectId, projectId),
          eq(periodLocks.facilityId, facilityId),
          eq(periodLocks.isLocked, true)
        ),
      });

      return !!lock;
    } catch (error) {
      console.error('Error checking period lock status:', error);
      return false;
    }
  }

  /**
   * Validate if edit operation is allowed
   * Checks period lock status and user permissions
   * 
   * @param reportingPeriodId - Reporting period ID
   * @param projectId - Project ID
   * @param facilityId - Facility ID
   * @param userId - User ID attempting the edit
   * @returns Validation result with allowed flag and reason if denied
   */
  async validateEditOperation(
    reportingPeriodId: number,
    projectId: number,
    facilityId: number,
    userId: number
  ): Promise<PeriodLockValidationResult> {
    try {
      // Check if period is locked
      const isLocked = await this.isPeriodLocked(
        reportingPeriodId,
        projectId,
        facilityId
      );

      if (!isLocked) {
        return { allowed: true };
      }

      // Check if user has admin override permission
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        return {
          allowed: false,
          reason: "User not found",
        };
      }

      const hasOverride = user.role === 'admin' || 
                         user.role === 'superadmin';

      if (hasOverride) {
        console.log(
          `User ${userId} (${user.role}) has override permission for locked period`
        );
        return { allowed: true };
      }

      // Log the attempted edit
      const lock = await db.query.periodLocks.findFirst({
        where: and(
          eq(periodLocks.reportingPeriodId, reportingPeriodId),
          eq(periodLocks.projectId, projectId),
          eq(periodLocks.facilityId, facilityId)
        ),
      });

      if (lock) {
        await this.logLockAction(
          lock.id,
          "EDIT_ATTEMPTED",
          userId,
          "User attempted to edit locked period"
        );
      }

      return {
        allowed: false,
        reason: 
          "This reporting period is locked due to an approved financial report. " +
          "Contact an administrator to unlock.",
      };
    } catch (error) {
      console.error('Error validating edit operation:', error);
      return {
        allowed: false,
        reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get all locks for a facility
   * Retrieves all period locks with related entities
   * 
   * @param facilityId - Facility ID
   * @returns Array of period locks with relations
   */
  async getLocksForFacility(facilityId: number): Promise<PeriodLockWithRelations[]> {
    try {
      const locks = await db.query.periodLocks.findMany({
        where: eq(periodLocks.facilityId, facilityId),
        with: {
          reportingPeriod: true,
          project: true,
          facility: true,
          lockedByUser: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          unlockedByUser: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return locks as PeriodLockWithRelations[];
    } catch (error) {
      console.error('Error fetching locks for facility:', error);
      return [];
    }
  }

  /**
   * Log lock-related actions
   * Private method to create audit log entries
   * 
   * @param periodLockId - Period lock ID
   * @param action - Action type (LOCKED, UNLOCKED, EDIT_ATTEMPTED)
   * @param userId - User ID performing the action
   * @param reason - Reason for the action
   */
  private async logLockAction(
    periodLockId: number,
    action: "LOCKED" | "UNLOCKED" | "EDIT_ATTEMPTED",
    userId: number,
    reason: string
  ): Promise<void> {
    try {
      await db.insert(periodLockAuditLog).values({
        periodLockId,
        action,
        performedBy: userId,
        reason,
      });

      console.log(
        `Audit log created: lock=${periodLockId}, action=${action}, user=${userId}`
      );
    } catch (error) {
      console.error('Error logging lock action:', error);
      // Don't throw - audit logging failure shouldn't block the main operation
    }
  }
}

// Export singleton instance
export const periodLockService = new PeriodLockService();
