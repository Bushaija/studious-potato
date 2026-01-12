import { db } from "@/db";
import { approvalAuditLog } from "@/db/schema/approval-audit-log/schema";
import { schemaFormDataEntries } from "@/db/schema/schema-form-data-entries/schema";
import { users } from "@/db/schema/users/schema";
import { eq, desc } from "drizzle-orm";

export interface AuditEntry {
  id: number;
  planningId: number;
  previousStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT' | null;
  newStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT';
  actionBy: number;
  actionAt: string;
  comments: string | null;
  metadata: Record<string, any> | null;
  actionByUser?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export interface AuditMetadata {
  budgetAmount?: number;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  [key: string]: any;
}

export class AuditService {
  /**
   * Logs an approval action to create an immutable audit trail
   * @param planningId - The ID of the plan being acted upon
   * @param previousStatus - The previous approval status (null for initial creation)
   * @param newStatus - The new approval status
   * @param actionBy - The ID of the user performing the action
   * @param comments - Optional comments for the action
   * @param metadata - Additional context like IP address, user agent, etc.
   */
  async logApprovalAction(
    planningId: number,
    previousStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT' | null,
    newStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT',
    actionBy: number,
    comments?: string,
    metadata?: AuditMetadata
  ): Promise<void> {
    try {
      // Validate that the planning record exists
      const planExists = await db.query.schemaFormDataEntries.findFirst({
        where: eq(schemaFormDataEntries.id, planningId),
        columns: { id: true }
      });

      if (!planExists) {
        throw new Error(`Planning record with ID ${planningId} not found`);
      }

      // Validate that the user exists
      const userExists = await db.query.users.findFirst({
        where: eq(users.id, actionBy),
        columns: { id: true }
      });

      if (!userExists) {
        throw new Error(`User with ID ${actionBy} not found`);
      }

      // Insert audit log entry
      await db.insert(approvalAuditLog).values({
        planningId,
        previousStatus,
        newStatus,
        actionBy,
        actionAt: new Date(),
        comments: comments || null,
        metadata: metadata || null
      });

      console.log(`Audit log created: Plan ${planningId} status changed from ${previousStatus} to ${newStatus} by user ${actionBy}`);

    } catch (error) {
      console.error('Error logging approval action:', error);
      // Re-throw the error to ensure calling code is aware of the failure
      throw new Error(`Failed to log approval action: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves the complete audit trail for a specific plan
   * @param planningId - The ID of the plan to get audit history for
   * @returns Array of audit entries with user information
   */
  async getAuditTrail(planningId: number): Promise<AuditEntry[]> {
    try {
      // Validate that the planning record exists
      const planExists = await db.query.schemaFormDataEntries.findFirst({
        where: eq(schemaFormDataEntries.id, planningId),
        columns: { id: true }
      });

      if (!planExists) {
        throw new Error(`Planning record with ID ${planningId} not found`);
      }

      // Retrieve audit trail with user information
      const auditEntries = await db.query.approvalAuditLog.findMany({
        where: eq(approvalAuditLog.planningId, planningId),
        orderBy: [desc(approvalAuditLog.actionAt)],
        with: {
          actionByUser: {
            columns: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      });

      // Transform the results to match our interface
      return auditEntries.map(entry => ({
        id: entry.id,
        planningId: entry.planningId,
        previousStatus: entry.previousStatus,
        newStatus: entry.newStatus,
        actionBy: entry.actionBy,
        actionAt: entry.actionAt.toISOString(),
        comments: entry.comments,
        metadata: entry.metadata as Record<string, any> | null,
        actionByUser: entry.actionByUser ? {
          id: entry.actionByUser.id,
          name: entry.actionByUser.name,
          email: entry.actionByUser.email,
          role: entry.actionByUser.role
        } : undefined
      }));

    } catch (error) {
      console.error('Error retrieving audit trail:', error);
      throw new Error(`Failed to retrieve audit trail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Logs approval action with atomic transaction support
   * This method ensures that status updates and audit logging happen atomically
   * @param planningId - The ID of the plan being updated
   * @param previousStatus - The previous approval status
   * @param newStatus - The new approval status
   * @param actionBy - The ID of the user performing the action
   * @param comments - Optional comments for the action
   * @param metadata - Additional context metadata
   * @param updateData - The data to update in the planning record
   */
  async logApprovalActionWithTransaction(
    planningId: number,
    previousStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT' | null,
    newStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT',
    actionBy: number,
    comments?: string,
    metadata?: AuditMetadata,
    updateData?: Partial<typeof schemaFormDataEntries.$inferInsert>
  ): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        // Update the planning record if updateData is provided
        if (updateData) {
          await tx.update(schemaFormDataEntries)
            .set({
              ...updateData,
              updatedBy: actionBy,
              updatedAt: new Date()
            })
            .where(eq(schemaFormDataEntries.id, planningId));
        }

        // Insert audit log entry
        await tx.insert(approvalAuditLog).values({
          planningId,
          previousStatus,
          newStatus,
          actionBy,
          actionAt: new Date(),
          comments: comments || null,
          metadata: metadata || null
        });
      });

      console.log(`Atomic approval action completed: Plan ${planningId} status changed from ${previousStatus} to ${newStatus} by user ${actionBy}`);

    } catch (error) {
      console.error('Error in atomic approval action:', error);
      throw new Error(`Failed to complete atomic approval action: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets audit statistics for a specific plan
   * @param planningId - The ID of the plan to get statistics for
   * @returns Object containing audit statistics
   */
  async getAuditStatistics(planningId: number): Promise<{
    totalActions: number;
    firstAction: string | null;
    lastAction: string | null;
    uniqueActors: number;
    statusChanges: Array<{ from: string | null; to: string; count: number }>;
  }> {
    try {
      const auditEntries = await this.getAuditTrail(planningId);

      if (auditEntries.length === 0) {
        return {
          totalActions: 0,
          firstAction: null,
          lastAction: null,
          uniqueActors: 0,
          statusChanges: []
        };
      }

      // Calculate statistics
      const uniqueActors = new Set(auditEntries.map(entry => entry.actionBy)).size;
      const firstAction = auditEntries[auditEntries.length - 1].actionAt;
      const lastAction = auditEntries[0].actionAt;

      // Count status changes
      const statusChangeMap = new Map<string, number>();
      auditEntries.forEach(entry => {
        const changeKey = `${entry.previousStatus || 'NULL'} -> ${entry.newStatus}`;
        statusChangeMap.set(changeKey, (statusChangeMap.get(changeKey) || 0) + 1);
      });

      const statusChanges = Array.from(statusChangeMap.entries()).map(([change, count]) => {
        const [from, to] = change.split(' -> ');
        return {
          from: from === 'NULL' ? null : from,
          to,
          count
        };
      });

      return {
        totalActions: auditEntries.length,
        firstAction,
        lastAction,
        uniqueActors,
        statusChanges
      };

    } catch (error) {
      console.error('Error getting audit statistics:', error);
      throw new Error(`Failed to get audit statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const auditService = new AuditService();