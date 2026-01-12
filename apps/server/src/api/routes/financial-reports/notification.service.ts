import { db } from "@/db";
import { users } from "@/db/schema/users/schema";
import { financialReports } from "@/db/schema/financial-reports/schema";
import { facilities } from "@/db/schema/facilities/schema";
import { eq, inArray } from "drizzle-orm";
import type { ReportStatus } from "./financial-reports.types";
import { FacilityHierarchyService } from "../../services/facility-hierarchy.service";

/**
 * Notification service for financial report workflow
 * Handles notifications to DAF users, DG users, and report creators
 * Requirements: 1.4, 2.4, 2.8, 3.8
 */
export class NotificationService {
  
  /**
   * Notifies all DAF users when a report is submitted for approval
   * Requirements: 1.4
   * @deprecated Use notifyDafUsersForFacility instead for hierarchy-aware routing
   */
  async notifyDafUsers(reportId: number, reportTitle: string): Promise<void> {
    try {
      // Get all users with DAF role
      const dafUsers = await db.query.users.findMany({
        where: eq(users.role, 'daf'),
        columns: {
          id: true,
          name: true,
          email: true,
        }
      });

      if (dafUsers.length === 0) {
        console.warn(`No DAF users found to notify for report ${reportId}`);
        return;
      }

      // Log notification (in production, this would send emails/push notifications)
      console.log(`[NOTIFICATION] Notifying ${dafUsers.length} DAF user(s) about report submission`);
      console.log(`  Report ID: ${reportId}`);
      console.log(`  Report Title: ${reportTitle}`);
      console.log(`  Recipients:`, dafUsers.map(u => `${u.name} (${u.email})`).join(', '));
      
      // TODO: Implement actual notification mechanism (email, push notification, etc.)
      // Example: await emailService.send({
      //   to: dafUsers.map(u => u.email),
      //   subject: `New Financial Report Pending Your Approval: ${reportTitle}`,
      //   body: `A new financial report "${reportTitle}" has been submitted and requires your review.`
      // });
      
    } catch (error) {
      console.error(`Failed to notify DAF users for report ${reportId}:`, error);
      // Don't throw - notification failures shouldn't block workflow
    }
  }

  /**
   * Notifies DAF users at the correct hospital based on facility hierarchy
   * Requirements: 1.4, 3.1, 9.1-9.5
   */
  async notifyDafUsersForFacility(facilityId: number, reportId: number, reportTitle: string): Promise<void> {
    try {
      // Get facility details for context
      const facility = await db.query.facilities.findFirst({
        where: eq(facilities.id, facilityId),
        columns: {
          id: true,
          name: true,
          districtId: true,
        },
        with: {
          district: {
            columns: {
              name: true,
            }
          }
        }
      });

      if (!facility) {
        console.error(`Facility ${facilityId} not found for notification`);
        return;
      }

      // Get DAF users for this facility's approval chain
      const dafUsers = await FacilityHierarchyService.getDafUsersForFacility(facilityId);

      if (dafUsers.length === 0) {
        console.warn(`No DAF users found for facility ${facilityId} (${facility.name})`);
        // Fallback to admin users if no DAF users found (Requirement 9.5)
        const adminUsers = await db.query.users.findMany({
          where: eq(users.role, 'admin'),
          columns: {
            id: true,
            name: true,
            email: true,
          }
        });
        
        if (adminUsers.length > 0) {
          console.log(`[NOTIFICATION] Falling back to ${adminUsers.length} admin user(s)`);
          console.log(`  Report ID: ${reportId}`);
          console.log(`  Report Title: ${reportTitle}`);
          console.log(`  Facility: ${facility.name}`);
          console.log(`  District: ${facility.district?.name || 'Unknown'}`);
          console.log(`  Recipients:`, adminUsers.map(u => `${u.name} (${u.email})`).join(', '));
        }
        return;
      }

      // Log notification (in production, this would send emails/push notifications)
      console.log(`[NOTIFICATION] Notifying ${dafUsers.length} DAF user(s) about report submission`);
      console.log(`  Report ID: ${reportId}`);
      console.log(`  Report Title: ${reportTitle}`);
      console.log(`  Facility: ${facility.name}`);
      console.log(`  District: ${facility.district?.name || 'Unknown'}`);
      console.log(`  Recipients:`, dafUsers.map((u: typeof users.$inferSelect) => `${u.name} (${u.email})`).join(', '));
      
      // TODO: Implement actual notification mechanism with facility context
      // Example: await emailService.send({
      //   to: dafUsers.map(u => u.email),
      //   subject: `New Financial Report Pending Your Approval: ${reportTitle}`,
      //   body: `A new financial report "${reportTitle}" from ${facility.name} (${facility.district?.name}) has been submitted and requires your review.`
      // });
      
    } catch (error) {
      console.error(`Failed to notify DAF users for facility ${facilityId}:`, error);
      // Don't throw - notification failures shouldn't block workflow
    }
  }

  /**
   * Notifies all DG users when a report is approved by DAF
   * Requirements: 2.4
   * @deprecated Use notifyDgUsersForFacility instead for hierarchy-aware routing
   */
  async notifyDgUsers(reportId: number, reportTitle: string): Promise<void> {
    try {
      // Get all users with DG role
      const dgUsers = await db.query.users.findMany({
        where: eq(users.role, 'dg'),
        columns: {
          id: true,
          name: true,
          email: true,
        }
      });

      if (dgUsers.length === 0) {
        console.warn(`No DG users found to notify for report ${reportId}`);
        return;
      }

      // Log notification (in production, this would send emails/push notifications)
      console.log(`[NOTIFICATION] Notifying ${dgUsers.length} DG user(s) about DAF approval`);
      console.log(`  Report ID: ${reportId}`);
      console.log(`  Report Title: ${reportTitle}`);
      console.log(`  Recipients:`, dgUsers.map(u => `${u.name} (${u.email})`).join(', '));
      
      // TODO: Implement actual notification mechanism
      // Example: await emailService.send({
      //   to: dgUsers.map(u => u.email),
      //   subject: `Financial Report Approved by DAF - Final Approval Required: ${reportTitle}`,
      //   body: `The financial report "${reportTitle}" has been approved by DAF and requires your final approval.`
      // });
      
    } catch (error) {
      console.error(`Failed to notify DG users for report ${reportId}:`, error);
      // Don't throw - notification failures shouldn't block workflow
    }
  }

  /**
   * Notifies DG users at the correct hospital based on facility hierarchy
   * Requirements: 2.4, 3.2, 9.1-9.5
   */
  async notifyDgUsersForFacility(facilityId: number, reportId: number, reportTitle: string): Promise<void> {
    try {
      // Get facility details for context
      const facility = await db.query.facilities.findFirst({
        where: eq(facilities.id, facilityId),
        columns: {
          id: true,
          name: true,
          districtId: true,
        },
        with: {
          district: {
            columns: {
              name: true,
            }
          }
        }
      });

      if (!facility) {
        console.error(`Facility ${facilityId} not found for notification`);
        return;
      }

      // Get DG users for this facility's approval chain
      const dgUsers = await FacilityHierarchyService.getDgUsersForFacility(facilityId);

      if (dgUsers.length === 0) {
        console.warn(`No DG users found for facility ${facilityId} (${facility.name})`);
        // Fallback to admin users if no DG users found (Requirement 9.5)
        const adminUsers = await db.query.users.findMany({
          where: eq(users.role, 'admin'),
          columns: {
            id: true,
            name: true,
            email: true,
          }
        });
        
        if (adminUsers.length > 0) {
          console.log(`[NOTIFICATION] Falling back to ${adminUsers.length} admin user(s)`);
          console.log(`  Report ID: ${reportId}`);
          console.log(`  Report Title: ${reportTitle}`);
          console.log(`  Facility: ${facility.name}`);
          console.log(`  District: ${facility.district?.name || 'Unknown'}`);
          console.log(`  Recipients:`, adminUsers.map(u => `${u.name} (${u.email})`).join(', '));
        }
        return;
      }

      // Log notification (in production, this would send emails/push notifications)
      console.log(`[NOTIFICATION] Notifying ${dgUsers.length} DG user(s) about DAF approval`);
      console.log(`  Report ID: ${reportId}`);
      console.log(`  Report Title: ${reportTitle}`);
      console.log(`  Facility: ${facility.name}`);
      console.log(`  District: ${facility.district?.name || 'Unknown'}`);
      console.log(`  Recipients:`, dgUsers.map((u: typeof users.$inferSelect) => `${u.name} (${u.email})`).join(', '));
      
      // TODO: Implement actual notification mechanism with facility context
      // Example: await emailService.send({
      //   to: dgUsers.map(u => u.email),
      //   subject: `Financial Report Approved by DAF - Final Approval Required: ${reportTitle}`,
      //   body: `The financial report "${reportTitle}" from ${facility.name} (${facility.district?.name}) has been approved by DAF and requires your final approval.`
      // });
      
    } catch (error) {
      console.error(`Failed to notify DG users for facility ${facilityId}:`, error);
      // Don't throw - notification failures shouldn't block workflow
    }
  }

  /**
   * Notifies the report creator about rejection or status changes
   * Requirements: 2.8, 3.8
   */
  async notifyReportCreator(
    reportId: number, 
    status: ReportStatus, 
    comment?: string
  ): Promise<void> {
    try {
      // Get the report with creator information
      const report = await db.query.financialReports.findFirst({
        where: eq(financialReports.id, reportId),
        columns: {
          id: true,
          title: true,
          createdBy: true,
          status: true,
        }
      });

      if (!report) {
        console.error(`Report ${reportId} not found for notification`);
        return;
      }

      if (!report.createdBy) {
        console.warn(`Report ${reportId} has no creator to notify`);
        return;
      }

      // Get creator user details
      const creator = await db.query.users.findFirst({
        where: eq(users.id, report.createdBy),
        columns: {
          id: true,
          name: true,
          email: true,
        }
      });

      if (!creator) {
        console.error(`Creator user ${report.createdBy} not found for report ${reportId}`);
        return;
      }

      // Determine notification message based on status
      const notificationDetails = this.getNotificationDetails(status, report.title, comment);
      const { subject, message: notificationMessage } = notificationDetails;

      // Log notification (in production, this would send emails/push notifications)
      console.log(`[NOTIFICATION] Notifying report creator about status change`);
      console.log(`  Report ID: ${reportId}`);
      console.log(`  Report Title: ${report.title}`);
      console.log(`  Status: ${status}`);
      console.log(`  Subject: ${subject}`);
      console.log(`  Message: ${notificationMessage}`);
      console.log(`  Recipient: ${creator.name} (${creator.email})`);
      
      // TODO: Implement actual notification mechanism
      // Example: await emailService.send({
      //   to: creator.email,
      //   subject: subject,
      //   body: notificationMessage
      // });
      
    } catch (error) {
      console.error(`Failed to notify report creator for report ${reportId}:`, error);
      // Don't throw - notification failures shouldn't block workflow
    }
  }

  /**
   * Sends a generic notification to specific users
   * Can be used for custom notification scenarios
   */
  async notifyUsers(
    userIds: number[], 
    subject: string, 
    message: string
  ): Promise<void> {
    try {
      if (userIds.length === 0) {
        console.warn('No users specified for notification');
        return;
      }

      // Get user details
      const recipients = await db.query.users.findMany({
        where: inArray(users.id, userIds),
        columns: {
          id: true,
          name: true,
          email: true,
        }
      });

      if (recipients.length === 0) {
        console.warn(`No valid users found for notification`);
        return;
      }

      // Log notification
      console.log(`[NOTIFICATION] Sending notification to ${recipients.length} user(s)`);
      console.log(`  Subject: ${subject}`);
      console.log(`  Message: ${message}`);
      console.log(`  Recipients:`, recipients.map(u => `${u.name} (${u.email})`).join(', '));
      
      // TODO: Implement actual notification mechanism
      
    } catch (error) {
      console.error(`Failed to notify users:`, error);
      // Don't throw - notification failures shouldn't block workflow
    }
  }

  /**
   * Helper method to generate notification details based on status
   */
  private getNotificationDetails(
    status: ReportStatus, 
    reportTitle: string, 
    comment?: string
  ): { subject: string; message: string } {
    let subject = '';
    let message = '';
    
    if (status === 'rejected_by_daf') {
      subject = `Financial Report Rejected by DAF: ${reportTitle}`;
      message = `Your financial report "${reportTitle}" has been rejected by DAF.`;
      if (comment) {
        message += `\n\nRejection reason: ${comment}`;
      }
      message += '\n\nYou can now edit and resubmit the report.';
    } else if (status === 'rejected_by_dg') {
      subject = `Financial Report Rejected by DG: ${reportTitle}`;
      message = `Your financial report "${reportTitle}" has been rejected by DG.`;
      if (comment) {
        message += `\n\nRejection reason: ${comment}`;
      }
      message += '\n\nYou can now edit and resubmit the report.';
    } else if (status === 'fully_approved') {
      subject = `Financial Report Fully Approved: ${reportTitle}`;
      message = `Your financial report "${reportTitle}" has been fully approved by DG.`;
    }

    return { subject, message };
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
