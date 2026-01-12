Flow:
1. Admin Dashboard

Admin fills form: name, email, role
Clicks "Create User"
Shows success: "User created. Verification email sent to {email}"

2. User Receives Email

Subject: "Set up your account"
Body: "You've been invited to join [App]. Click below to verify your email and create your password"
Big button: "Set Up Account"

3. User Clicks Link → Lands on Setup Page

Page shows: "Welcome! Let's set up your account"
Display: email (read-only/disabled)
Input: "Create Password" field
Input: "Confirm Password" field
Button: "Complete Setup"

4. After Submission

Redirect to login page OR auto-login
Show: "Account activated! You're all set."

Edge Cases to Handle:

Expired token: Show message "This link has expired. Contact your administrator."
Already verified: Redirect to login with "Account already activated"
Invalid token: Show error page

Optional Enhancement:
Add "Resend verification email" button in admin dashboard for pending users.


Implementation walth throught:

Step 1: Configure Better Auth
First, set up your auth configuration with email verification and admin capabilities :


import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false, // Don't auto-login after password setup
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, request) => {
      // Send your custom setup email
      await sendSetupEmail({
        to: user.email,
        subject: "Set up your account",
        setupUrl: url, // This contains the verification token
        userName: user.name,
      });
    },
    sendOnSignUp: true,
  },
  plugins: [
    admin() // Enables admin functionality
  ],
});

Step 2: Admin Dashboard - Create User
Create an admin endpoint to invite users :


// In your admin route
const { data, error } = await authClient.signUp.email({
  name: formData.name,
  email: formData.email, 
  password: "temporary-password-will-be-reset", // User will set their own
  // Add role if using admin plugin
});

The sendVerificationEmail function will automatically be called, sending the setup email .

Step 3: Email Template
Your sendSetupEmail function should create an email like:


async function sendSetupEmail({ to, subject, setupUrl, userName }) {
  const emailBody = `
    <h2>Welcome ${userName}!</h2>
    <p>You've been invited to join [App]. Click below to verify your email and create your password:</p>
    <a href="${setupUrl}" style="...">Set Up Account</a>
  `;
  
  // Send email using your preferred service
  await emailService.send({
    to,
    subject,
    html: emailBody
  });
}
Step 4: Setup Page
Create a setup page that handles the verification token. When users click the email link, they'll land on your setup page with the token in the URL.


// Get token from URL params
const token = new URLSearchParams(window.location.search).get("token");
// On form submission, reset the password using the token
const { data, error } = await authClient.resetPassword({
  newPassword: formData.password,
  token: token,
});

Step 5: Handle Edge Cases
Expired/Invalid Token: The resetPassword function will return an error if the token is invalid or expired .


if (error) {
  if (error.message.includes("INVALID_TOKEN")) {
    // Show "This link has expired" message
  }
}
Already Verified: You can check user verification status and redirect accordingly.

Step 6: Custom Email Validation (Optional)
If you need to validate admin-created emails against specific domains, you can use database hooks :


export const auth = betterAuth({
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const email = user.email?.toLowerCase() ?? "";
          const domain = email.split("@")[1];
          
          // Your domain validation logic
          if (!allowedDomains.includes(domain)) {
            throw new APIError("UNPROCESSABLE_ENTITY", { 
              message: "Only corporate email addresses are allowed." 
            });
          }
        },
      },
    },
  },
});

Key Configuration Options
requireEmailVerification: true - Prevents login until email is verified
autoSignIn: false - Prevents automatic login after password setup
sendOnSignUp: true - Automatically sends verification email when user is created
resetPasswordTokenExpiresIn - Controls token expiration (default: 3600 seconds)