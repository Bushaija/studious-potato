import { config } from "dotenv";
import { Resend } from "resend";
import nodemailer from "nodemailer";

// Ensure .env is loaded before accessing environment variables
config();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Create nodemailer transporter
const transporter = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
}) : null;

// Determine which email service to use
const emailService = transporter ? 'smtp' : (resend ? 'resend' : 'dev');

interface VerificationEmailData {
  email: string;
  otp: string;
  type: "sign-in" | "email-verification" | "forget-password";
}

interface InvitationEmailData {
  email: string;
  inviterEmail: string;
  organizationName: string;
  inviteLink: string;
}

interface AccountCreationEmailData {
  email: string;
  inviterEmail: string;
  organizationName: string;
  inviteLink: string;
  temporaryPassword: string;
}

interface AccountSetupEmailData {
  email: string;
  name: string;
  setupLink: string;
  adminName: string;
  role: string;
}

interface AccountStatusEmailData {
  email: string;
  name: string;
  status: 'activated' | 'deactivated';
  adminName: string;
}

export const sendVerificationEmail = async ({
  email,
  otp,
  type,
}: VerificationEmailData) => {
  console.log(`[EMAIL-SERVICE] sendVerificationEmail called for ${email}, type: ${type}`);
  
  let subject: string;
  let htmlContent: string;

  switch (type) {
    case "sign-in":
      subject = "Your Budget Management Sign-In Code";
      htmlContent = generateSignInEmail(otp);
      break;
    case "email-verification":
      subject = "Verify Your Email Address";
      htmlContent = generateVerificationEmail(otp);
      break;
    case "forget-password":
      subject = "Reset Your Password";
      htmlContent = generatePasswordResetEmail(otp, email);
      break;
    default:
      throw new Error(`Unsupported email type: ${type}`);
  }

  const from = process.env.FROM_EMAIL || "Budget Management <noreply@budgetmgt.gov.rw>";

  // Use SMTP if configured
  if (emailService === 'smtp' && transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        to: email,
        subject,
        html: htmlContent,
      });
      console.log(`[SMTP] Email sent to ${email}:`, info.messageId);
      return info;
    } catch (error) {
      console.error(`[SMTP] Failed to send email:`, error);
      console.log(`[DEV] Reset link: ${process.env.FRONTEND_URL || 'http://localhost:2222'}/reset-password?token=${otp}&email=${encodeURIComponent(email)}`);
      throw error;
    }
  }

  // Use Resend if configured
  if (emailService === 'resend' && resend) {
    try {
      const response = await resend.emails.send({
        from,
        to: email,
        subject,
        html: htmlContent,
      });
      console.log(`[Resend] Email sent to ${email}:`, response.data?.id || 'sent');
      return response;
    } catch (error) {
      console.error(`[Resend] Failed to send email:`, error);
      throw error;
    }
  }

  // Dev mode
  console.warn(`[DEV MODE] No email service configured`);
  console.log(`[DEV] Password reset code for ${email}: ${otp}`);
  console.log(`[DEV] Reset link: ${process.env.FRONTEND_URL || 'http://localhost:2222'}/reset-password?token=${otp}&email=${encodeURIComponent(email)}`);
};

export const sendAccountCreationEmail = async ({
  email,
  inviterEmail,
  organizationName,
  inviteLink,
  temporaryPassword,
}: AccountCreationEmailData) => {
  if (!resend) {
    console.warn("Resend not configured - account creation email sending skipped");
    return;
  }

  const htmlContent = generateAccountCreationEmail({
    inviterEmail,
    organizationName,
    inviteLink,
    recipientEmail: email,
    temporaryPassword,
  });

  try {
    const response = await resend.emails.send({
      from: process.env.FROM_EMAIL || "Budget Management <noreply@budgetmgt.gov.rw>",
      to: email,
      subject: `Your Budget Management System Account - ${organizationName}`,
      html: htmlContent,
    });
    
    console.log(`Account creation email sent successfully to ${email}:`, response.data?.id || 'sent');
    return response;
  } catch (error) {
    console.error("Failed to send account creation email:", error);
    throw error;
  }
};

export const sendAccountStatusEmail = async ({
  email,
  name,
  status,
  adminName,
}: AccountStatusEmailData) => {
  if (!resend) {
    console.warn("Resend not configured - account status email sending skipped");
    return;
  }

  const htmlContent = generateAccountStatusEmail({
    name,
    status,
    adminName,
  });

  const subject = status === 'activated' 
    ? "Your Budget Management Account Has Been Activated"
    : "Your Budget Management Account Has Been Deactivated";

  try {
    const response = await resend.emails.send({
      from: process.env.FROM_EMAIL || "Budget Management <noreply@budgetmgt.gov.rw>",
      to: email,
      subject,
      html: htmlContent,
    });
    
    console.log(`Account status email sent successfully to ${email}:`, response.data?.id || 'sent');
    return response;
  } catch (error) {
    console.error("Failed to send account status email:", error);
    throw error;
  }
};

export const sendAccountSetupEmail = async ({
  email,
  name,
  setupLink,
  adminName,
  role,
}: AccountSetupEmailData) => {
  const htmlContent = generateAccountSetupEmail({
    name,
    setupLink,
    adminName,
    role,
  });

  const subject = "Set Up Your Budget Management Account";
  const from = process.env.FROM_EMAIL || "Budget Management <noreply@budgetmgt.gov.rw>";

  // Use SMTP if configured
  if (emailService === 'smtp' && transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        to: email,
        subject,
        html: htmlContent,
      });
      
      console.log(`[SMTP] Account setup email sent to ${email}:`, info.messageId);
      return info;
    } catch (error) {
      console.error(`[SMTP] Failed to send account setup email to ${email}:`, error);
      console.warn(`[DEV MODE] Account setup link for ${email}: ${setupLink}`);
      return;
    }
  }

  // Use Resend if configured
  if (emailService === 'resend' && resend) {
    try {
      const response = await resend.emails.send({
        from,
        to: email,
        subject,
        html: htmlContent,
      });
      
      if (response.error) {
        console.error(`[Resend] Failed to send account setup email to ${email}:`, response.error);
        console.warn(`[DEV MODE] Account setup link for ${email}: ${setupLink}`);
        return;
      }
      
      console.log(`[Resend] Account setup email sent to ${email}:`, response.data?.id || 'sent');
      return response;
    } catch (error) {
      console.error(`[Resend] Failed to send account setup email:`, error);
      console.warn(`[DEV MODE] Account setup link for ${email}: ${setupLink}`);
      return;
    }
  }

  // Dev mode - just log the link
  console.warn(`[DEV MODE] No email service configured`);
  console.log(`[DEV MODE] Account setup link for ${email}: ${setupLink}`);
};

// Existing email templates
const generateSignInEmail = (otp: string) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; color: #1e293b;">
    <div style="background-color: white; padding: 32px; border-radius: 8px; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #1e40af; font-size: 24px; margin: 0;">Budget Management System</h1>
        <p style="color: #64748b; margin: 8px 0 0 0;">Government of Rwanda</p>
      </div>
      
      <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 16px;">Your Sign-In Code</h2>
      <p style="margin-bottom: 24px;">Here is your one-time password to sign in:</p>
      
      <div style="background-color: #f1f5f9; padding: 24px; border-radius: 6px; text-align: center; margin: 24px 0;">
        <span style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #1e40af; font-family: monospace;">
          ${otp}
        </span>
      </div>
      
      <p style="color: #64748b; font-size: 14px; margin: 24px 0 0 0;">
        This code will expire in 10 minutes. If you didn't request this code, you can safely ignore this email.
      </p>
    </div>
  </div>
`;

const generateVerificationEmail = (otp: string) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; color: #1e293b;">
    <div style="background-color: white; padding: 32px; border-radius: 8px; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #1e40af; font-size: 24px; margin: 0;">Budget Management System</h1>
        <p style="color: #64748b; margin: 8px 0 0 0;">Government of Rwanda</p>
      </div>
      
      <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 16px;">Verify Your Email</h2>
      <p style="margin-bottom: 24px;">Please use the following code to verify your email address:</p>
      
      <div style="background-color: #f1f5f9; padding: 24px; border-radius: 6px; text-align: center; margin: 24px 0;">
        <span style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #16a34a; font-family: monospace;">
          ${otp}
        </span>
      </div>
      
      <p style="color: #64748b; font-size: 14px; margin: 24px 0 0 0;">
        This code will expire in 10 minutes. If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
  </div>
`;

const generatePasswordResetEmail = (otp: string, email?: string) => {
  const resetLink = email 
    ? `${process.env.FRONTEND_URL || 'http://localhost:2222'}/rina/reset-password?token=${otp}&email=${encodeURIComponent(email)}`
    : undefined;
    
  return `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; color: #1e293b;">
    <div style="background-color: white; padding: 32px; border-radius: 8px; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #1e40af; font-size: 24px; margin: 0;">Budget Management System</h1>
        <p style="color: #64748b; margin: 8px 0 0 0;">Government of Rwanda</p>
      </div>
      
      <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 16px;">Reset Your Password</h2>
      <p style="margin-bottom: 24px;">You requested to reset your password. Click the button below to reset it:</p>
      
      ${resetLink ? `
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetLink}" style="display: inline-block; background-color: #d97706; color: white; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 16px;">
          Reset Password
        </a>
      </div>
      
      <p style="text-align: center; color: #64748b; font-size: 14px; margin: 16px 0;">
        Or use this code if the button doesn't work:
      </p>
      ` : '<p style="margin-bottom: 24px;">Use the following code:</p>'}
      
      <div style="background-color: #fef3c7; padding: 24px; border-radius: 6px; text-align: center; margin: 24px 0; border: 1px solid #fbbf24;">
        <span style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #d97706; font-family: monospace;">
          ${otp}
        </span>
      </div>
      
      <p style="color: #64748b; font-size: 14px; margin: 24px 0 0 0;">
        This code will expire in 10 minutes. If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>
  </div>
`;
};

// New email template for account creation by admin
const generateAccountCreationEmail = ({
  inviterEmail,
  organizationName,
  inviteLink,
  recipientEmail,
  temporaryPassword,
}: {
  inviterEmail: string;
  organizationName: string;
  inviteLink: string;
  recipientEmail: string;
  temporaryPassword: string;
}) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; color: #1e293b;">
    <div style="background-color: white; padding: 32px; border-radius: 8px; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #1e40af; font-size: 24px; margin: 0;">Budget Management System</h1>
        <p style="color: #64748b; margin: 8px 0 0 0;">Government of Rwanda</p>
      </div>
      
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background-color: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 50px; font-size: 14px; font-weight: 500;">
          Account Created
        </div>
      </div>
      
      <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 16px; text-align: center;">Welcome to the Team!</h2>
      
      <div style="background-color: #f8fafc; padding: 24px; border-radius: 8px; margin: 24px 0;">
        <p style="margin: 0 0 16px 0;">
          <strong>${inviterEmail}</strong> has created an account for you in <strong>${organizationName}</strong> on the Budget Management System.
        </p>
        <p style="margin: 0;">
          You can now access financial planning, execution, and reporting tools for healthcare facilities.
        </p>
      </div>
      
      <div style="background-color: #fff7ed; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #ea580c;">
        <h3 style="color: #ea580c; font-size: 16px; margin: 0 0 16px 0;">Initial Login Credentials</h3>
        <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${recipientEmail}</p>
        <p style="margin: 0 0 16px 0;"><strong>Temporary Password:</strong> <code style="background: #fef3c7; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-weight: bold;">${temporaryPassword}</code></p>
        <p style="color: #c2410c; font-size: 14px; margin: 0;">
          ⚠️ You will be required to change your password on first login for security.
        </p>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${inviteLink}" style="display: inline-block; background-color: #1e40af; color: white; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 16px;">
          Access Your Account
        </a>
      </div>
      
      <div style="background-color: #f1f5f9; padding: 20px; border-radius: 6px; margin: 24px 0;">
        <h4 style="color: #1e293b; font-size: 14px; margin: 0 0 12px 0;">What you can do:</h4>
        <ul style="color: #64748b; font-size: 14px; margin: 0; padding-left: 20px;">
          <li>Manage facility budgets and financial reports</li>
          <li>Track project expenditures and planning</li>
          <li>Generate financial statements and analytics</li>
          <li>Collaborate with your team on budget management</li>
        </ul>
      </div>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 32px; text-align: center;">
        <p style="color: #64748b; font-size: 12px; margin: 0;">
          This account was created for <strong>${recipientEmail}</strong>
        </p>
        <p style="color: #64748b; font-size: 12px; margin: 8px 0 0 0;">
          &copy; ${new Date().getFullYear()} Government of Rwanda - Budget Management System
        </p>
      </div>
    </div>
  </div>
`;

// New email template for account status changes
const generateAccountStatusEmail = ({
  name,
  status,
  adminName,
}: {
  name: string;
  status: 'activated' | 'deactivated';
  adminName: string;
}) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; color: #1e293b;">
    <div style="background-color: white; padding: 32px; border-radius: 8px; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #1e40af; font-size: 24px; margin: 0;">Budget Management System</h1>
        <p style="color: #64748b; margin: 8px 0 0 0;">Government of Rwanda</p>
      </div>
      
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background-color: ${status === 'activated' ? '#dcfce7' : '#fee2e2'}; color: ${status === 'activated' ? '#166534' : '#dc2626'}; padding: 8px 16px; border-radius: 50px; font-size: 14px; font-weight: 500;">
          Account ${status === 'activated' ? 'Activated' : 'Deactivated'}
        </div>
      </div>
      
      <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 16px;">
        Hello ${name},
      </h2>
      
      <div style="background-color: ${status === 'activated' ? '#f0fdf4' : '#fef2f2'}; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid ${status === 'activated' ? '#22c55e' : '#ef4444'};">
        <p style="margin: 0 0 16px 0;">
          Your Budget Management System account has been <strong>${status}</strong> by <strong>${adminName}</strong>.
        </p>
        ${status === 'activated' 
          ? '<p style="margin: 0;">You can now access the system using your existing credentials.</p>'
          : '<p style="margin: 0;">You will no longer be able to access the system. If you believe this is an error, please contact your administrator.</p>'
        }
      </div>
      
      ${status === 'activated' 
        ? `<div style="text-align: center; margin: 32px 0;">
             <a href="${process.env.FRONTEND_URL || 'http://localhost:2222'}/rina/sign-in" style="display: inline-block; background-color: #22c55e; color: white; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 16px;">
               Sign In to Your Account
             </a>
           </div>`
        : ''
      }
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 32px; text-align: center;">
        <p style="color: #64748b; font-size: 12px; margin: 8px 0 0 0;">
          &copy; ${new Date().getFullYear()} Government of Rwanda - Budget Management System
        </p>
      </div>
    </div>
  </div>
`;

// Keep original invitation email for organization invites
export const sendInvitationEmail = async ({
  email,
  inviterEmail,
  organizationName,
  inviteLink,
}: InvitationEmailData) => {
  if (!resend) {
    console.warn("Resend not configured - invitation email sending skipped");
    return;
  }

  const htmlContent = generateInvitationEmail({
    inviterEmail,
    organizationName,
    inviteLink,
    recipientEmail: email,
  });

  try {
    const response = await resend.emails.send({
      from: process.env.FROM_EMAIL || "Budget Management <noreply@budgetmgt.gov.rw>",
      to: email,
      subject: `You're invited to join ${organizationName} on Budget Management System`,
      html: htmlContent,
    });
    
    console.log(`Invitation email sent successfully to ${email}:`, response.data?.id || 'sent');
    return response;
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    throw error;
  }
};

const generateInvitationEmail = ({
  inviterEmail,
  organizationName,
  inviteLink,
  recipientEmail,
}: {
  inviterEmail: string;
  organizationName: string;
  inviteLink: string;
  recipientEmail: string;
}) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; color: #1e293b;">
    <div style="background-color: white; padding: 32px; border-radius: 8px; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #1e40af; font-size: 24px; margin: 0;">Budget Management System</h1>
        <p style="color: #64748b; margin: 8px 0 0 0;">Government of Rwanda</p>
      </div>
      
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background-color: #dbeafe; color: #1e40af; padding: 8px 16px; border-radius: 50px; font-size: 14px; font-weight: 500;">
          Organization Invitation
        </div>
      </div>
      
      <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 16px; text-align: center;">You've Been Invited!</h2>
      
      <div style="background-color: #f8fafc; padding: 24px; border-radius: 8px; margin: 24px 0;">
        <p style="margin: 0 0 16px 0;">
          <strong>${inviterEmail}</strong> has invited you to join <strong>${organizationName}</strong> on the Budget Management System.
        </p>
        <p style="margin: 0;">
          This system helps manage financial planning, execution, and reporting for healthcare facilities across Rwanda.
        </p>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${inviteLink}" style="display: inline-block; background-color: #1e40af; color: white; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 16px;">
          Accept Invitation
        </a>
      </div>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 32px; text-align: center;">
        <p style="color: #64748b; font-size: 12px; margin: 0;">
          This invitation was sent to <strong>${recipientEmail}</strong>
        </p>
        <p style="color: #64748b; font-size: 12px; margin: 8px 0 0 0;">
          &copy; ${new Date().getFullYear()} Government of Rwanda - Budget Management System
        </p>
      </div>
    </div>
  </div>
`;

const generateAccountSetupEmail = ({
  name,
  setupLink,
  adminName,
  role,
}: {
  name: string;
  setupLink: string;
  adminName: string;
  role: string;
}) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; color: #1e293b;">
    <div style="background-color: white; padding: 32px; border-radius: 8px; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #1e40af; font-size: 24px; margin: 0;">Budget Management System</h1>
        <p style="color: #64748b; margin: 8px 0 0 0;">Government of Rwanda</p>
      </div>
      
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background-color: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 50px; font-size: 14px; font-weight: 500;">
          Account Created
        </div>
      </div>
      
      <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 16px;">Welcome, ${name}!</h2>
      
      <div style="background-color: #f8fafc; padding: 24px; border-radius: 8px; margin: 24px 0;">
        <p style="margin: 0 0 16px 0;">
          <strong>${adminName}</strong> has created an account for you on the Budget Management System.
        </p>
        <p style="margin: 0 0 16px 0;">
          <strong>Your Role:</strong> <span style="background: #dbeafe; padding: 4px 8px; border-radius: 4px; font-weight: 500;">${role}</span>
        </p>
        <p style="margin: 0;">
          To get started, please click the button below to verify your email and set up your password.
        </p>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${setupLink}" style="display: inline-block; background-color: #16a34a; color: white; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 16px;">
          Set Up Your Account
        </a>
      </div>
      
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 6px; margin: 24px 0; border-left: 4px solid #f59e0b;">
        <p style="color: #92400e; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">
          🔒 Security Notice
        </p>
        <p style="color: #78350f; font-size: 14px; margin: 0;">
          This link will expire in 24 hours. For security, you'll be asked to create a strong password when you first sign in.
        </p>
      </div>
      
      <div style="background-color: #f1f5f9; padding: 20px; border-radius: 6px; margin: 24px 0;">
        <h4 style="color: #1e293b; font-size: 14px; margin: 0 0 12px 0;">What you can do:</h4>
        <ul style="color: #64748b; font-size: 14px; margin: 0; padding-left: 20px;">
          <li>Manage facility budgets and financial reports</li>
          <li>Track project expenditures and planning</li>
          <li>Generate financial statements and analytics</li>
          <li>Collaborate with your team on budget management</li>
        </ul>
      </div>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 32px; text-align: center;">
        <p style="color: #64748b; font-size: 12px; margin: 0;">
          If you didn't expect this email, please contact your administrator.
        </p>
        <p style="color: #64748b; font-size: 12px; margin: 8px 0 0 0;">
          &copy; ${new Date().getFullYear()} Government of Rwanda - Budget Management System
        </p>
      </div>
    </div>
  </div>
`;