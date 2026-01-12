import { Resend } from 'resend';
import { db } from "@/db";
import { users } from "@/db/schema/users/schema";
import { schemaFormDataEntries } from "@/db/schema/schema-form-data-entries/schema";
import { eq, inArray } from "drizzle-orm";

export interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
}

export interface NotificationResult {
  success: boolean;
  message: string;
  recipientCount?: number;
  failedRecipients?: string[];
}

export interface PendingReviewNotification {
  planningId: number;
  planTitle: string;
  createdBy: string;
  createdAt: string;
  adminIds: number[];
}

export interface ApprovalDecisionNotification {
  planningId: number;
  planTitle: string;
  plannerId: number;
  status: 'APPROVED' | 'REJECTED';
  reviewedBy: string;
  reviewComments?: string;
  reviewedAt: string;
}

export class NotificationService {
  private resend: Resend | null = null;
  private fromEmail: string = 'noreply@planning-system.com';

  constructor() {
    // Initialize Resend if API key is available
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  /**
   * Notify admins when a new plan is submitted for review
   * @param planningId - The ID of the plan requiring review
   * @param adminIds - Array of admin user IDs to notify
   * @returns NotificationResult indicating success/failure
   */
  async notifyPendingReview(planningId: number, adminIds: number[]): Promise<NotificationResult> {
    try {
      // Get plan details
      const plan = await db.query.schemaFormDataEntries.findFirst({
        where: eq(schemaFormDataEntries.id, planningId)
      });

      if (!plan) {
        return {
          success: false,
          message: 'Plan not found'
        };
      }

      // Get admin users
      const adminUsers = await db.query.users.findMany({
        where: inArray(users.id, adminIds),
        columns: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      });

      if (adminUsers.length === 0) {
        return {
          success: false,
          message: 'No admin users found'
        };
      }

      // Filter only users with admin/superadmin roles
      const validAdmins = adminUsers.filter(user => 
        ['admin', 'superadmin'].includes(user.role)
      );

      if (validAdmins.length === 0) {
        return {
          success: false,
          message: 'No users with admin permissions found'
        };
      }

      // Get creator details
      let creatorName = 'Unknown User';
      if (plan.createdBy) {
        const creator = await db.query.users.findFirst({
          where: eq(users.id, plan.createdBy),
          columns: { name: true }
        });
        creatorName = creator?.name || 'Unknown User';
      }

      const notification: PendingReviewNotification = {
        planningId: plan.id,
        planTitle: `Plan #${plan.id}`,
        createdBy: creatorName,
        createdAt: plan.createdAt?.toISOString() || new Date().toISOString(),
        adminIds: validAdmins.map(admin => admin.id)
      };

      // Send email notifications if Resend is configured
      const emailResults: boolean[] = [];
      const failedRecipients: string[] = [];

      if (this.resend) {
        for (const admin of validAdmins) {
          try {
            const emailContent = this.generatePendingReviewEmailTemplate(notification, admin.name);
            
            await this.resend.emails.send({
              from: this.fromEmail,
              to: admin.email,
              subject: `New Plan Pending Review: ${notification.planTitle}`,
              html: emailContent
            });
            
            emailResults.push(true);
          } catch (error) {
            console.error(`Failed to send email to ${admin.email}:`, error);
            emailResults.push(false);
            failedRecipients.push(admin.email);
          }
        }
      }

      // Log notification attempt
      console.log(`Pending review notification sent for plan ${planningId} to ${validAdmins.length} admins`);

      return {
        success: true,
        message: `Notification sent to ${validAdmins.length} admin(s)`,
        recipientCount: validAdmins.length,
        failedRecipients: failedRecipients.length > 0 ? failedRecipients : undefined
      };

    } catch (error) {
      console.error('Error sending pending review notification:', error);
      return {
        success: false,
        message: `Failed to send notification: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Notify planner when their plan has been approved or rejected
   * @param planningId - The ID of the plan that was reviewed
   * @param plannerId - The ID of the planner to notify
   * @param status - The approval decision (APPROVED or REJECTED)
   * @returns NotificationResult indicating success/failure
   */
  async notifyApprovalDecision(planningId: number, plannerId: number, status: 'APPROVED' | 'REJECTED'): Promise<NotificationResult> {
    try {
      // Get plan details
      const plan = await db.query.schemaFormDataEntries.findFirst({
        where: eq(schemaFormDataEntries.id, planningId)
      });

      if (!plan) {
        return {
          success: false,
          message: 'Plan not found'
        };
      }

      // Get planner user
      const planner = await db.query.users.findFirst({
        where: eq(users.id, plannerId),
        columns: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      });

      if (!planner) {
        return {
          success: false,
          message: 'Planner not found'
        };
      }

      // Get reviewer details
      let reviewerName = 'Unknown Reviewer';
      if (plan.reviewedBy) {
        const reviewer = await db.query.users.findFirst({
          where: eq(users.id, plan.reviewedBy),
          columns: { name: true }
        });
        reviewerName = reviewer?.name || 'Unknown Reviewer';
      }

      const notification: ApprovalDecisionNotification = {
        planningId: plan.id,
        planTitle: `Plan #${plan.id}`,
        plannerId: planner.id,
        status,
        reviewedBy: reviewerName,
        reviewComments: plan.reviewComments || undefined,
        reviewedAt: plan.reviewedAt?.toISOString() || new Date().toISOString()
      };

      // Send email notification if Resend is configured
      let emailSent = false;
      if (this.resend) {
        try {
          const emailContent = this.generateApprovalDecisionEmailTemplate(notification, planner.name);
          
          await this.resend.emails.send({
            from: this.fromEmail,
            to: planner.email,
            subject: `Plan ${status}: ${notification.planTitle}`,
            html: emailContent
          });
          
          emailSent = true;
        } catch (error) {
          console.error(`Failed to send email to ${planner.email}:`, error);
        }
      }

      // Log notification attempt
      console.log(`Approval decision notification sent for plan ${planningId} to planner ${plannerId}: ${status}`);

      return {
        success: true,
        message: `Notification sent to planner: ${planner.name}`,
        recipientCount: 1,
        failedRecipients: emailSent ? undefined : [planner.email]
      };

    } catch (error) {
      console.error('Error sending approval decision notification:', error);
      return {
        success: false,
        message: `Failed to send notification: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get all admin users who should receive pending review notifications
   * @returns Array of admin user IDs
   */
  async getAdminUsersForNotification(): Promise<number[]> {
    try {
      const adminUsers = await db.query.users.findMany({
        where: inArray(users.role, ['admin', 'superadmin']),
        columns: {
          id: true
        }
      });

      return adminUsers.map(user => user.id);
    } catch (error) {
      console.error('Error getting admin users for notification:', error);
      return [];
    }
  }

  /**
   * Generate HTML email template for pending review notifications
   * @param notification - The notification data
   * @param adminName - The name of the admin receiving the notification
   * @returns HTML email content
   */
  private generatePendingReviewEmailTemplate(notification: PendingReviewNotification, adminName: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Plan Pending Review</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
            .content { padding: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
            .details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>New Plan Pending Review</h2>
            </div>
            
            <div class="content">
              <p>Hello ${adminName},</p>
              
              <p>A new plan has been submitted and requires your review:</p>
              
              <div class="details">
                <strong>Plan Details:</strong><br>
                <strong>Title:</strong> ${notification.planTitle}<br>
                <strong>Created By:</strong> ${notification.createdBy}<br>
                <strong>Submitted:</strong> ${new Date(notification.createdAt).toLocaleString()}<br>
                <strong>Plan ID:</strong> #${notification.planningId}
              </div>
              
              <p>Please review this plan and take appropriate action (approve or reject) through the planning system.</p>
              
              <p>
                <a href="#" class="button">Review Plan</a>
              </p>
            </div>
            
            <div class="footer">
              <p>This is an automated notification from the Planning System. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate HTML email template for approval decision notifications
   * @param notification - The notification data
   * @param plannerName - The name of the planner receiving the notification
   * @returns HTML email content
   */
  private generateApprovalDecisionEmailTemplate(notification: ApprovalDecisionNotification, plannerName: string): string {
    const statusColor = notification.status === 'APPROVED' ? '#28a745' : '#dc3545';
    const statusText = notification.status === 'APPROVED' ? 'Approved' : 'Rejected';
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Plan ${statusText}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
            .content { padding: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px; font-size: 12px; color: #666; }
            .status { display: inline-block; padding: 5px 15px; color: white; border-radius: 3px; font-weight: bold; }
            .details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .comments { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Plan Review Decision</h2>
              <span class="status" style="background-color: ${statusColor};">${statusText}</span>
            </div>
            
            <div class="content">
              <p>Hello ${plannerName},</p>
              
              <p>Your plan has been reviewed and ${notification.status.toLowerCase()}:</p>
              
              <div class="details">
                <strong>Plan Details:</strong><br>
                <strong>Title:</strong> ${notification.planTitle}<br>
                <strong>Plan ID:</strong> #${notification.planningId}<br>
                <strong>Reviewed By:</strong> ${notification.reviewedBy}<br>
                <strong>Review Date:</strong> ${new Date(notification.reviewedAt).toLocaleString()}
              </div>
              
              ${notification.reviewComments ? `
                <div class="comments">
                  <strong>Review Comments:</strong><br>
                  ${notification.reviewComments}
                </div>
              ` : ''}
              
              ${notification.status === 'APPROVED' ? 
                '<p>Your plan is now approved and can proceed to execution phases such as budgeting and disbursement.</p>' :
                '<p>Please review the comments above and make necessary adjustments before resubmitting your plan.</p>'
              }
            </div>
            
            <div class="footer">
              <p>This is an automated notification from the Planning System. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();