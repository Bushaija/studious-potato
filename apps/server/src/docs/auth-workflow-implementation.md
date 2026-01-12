# Account Setup Workflow - Implementation Summary

## Overview
This document describes the implemented account setup workflow using Better Auth's native email verification system.

## Flow

### 1. Admin Creates User
- Admin fills form: name, email, role, facility, permissions
- Clicks "Create User"
- Backend creates user with `emailVerified: false` and `mustChangePassword: true`
- Better Auth automatically triggers email verification flow

### 2. Email Sent Automatically
- Better Auth's `sendVerificationEmail` is called automatically (due to `sendOnSignUp: true`)
- Custom email template sent via `sendAccountSetupEmail()`
- Email contains setup link: `/setup-account?token={token}&email={email}`
- Token is valid for 24 hours (Better Auth default)

### 3. User Clicks Link
- Lands on `/setup-account` page
- Page shows: "Welcome! Let's set up your account"
- Displays email (read-only)
- User enters password and confirms

### 4. Password Setup
- Form submits to Better Auth's `/api/auth/verify-email` endpoint
- Passes token and new password
- Better Auth verifies token and marks email as verified
- `onPasswordReset` hook sets `emailVerified: true` and `mustChangePassword: false`

### 5. Completion
- Success message shown
- Auto-redirect to sign-in page after 2 seconds
- User can now log in with their email and password

## Key Configuration

### Server (auth_.ts)
```typescript
emailAndPassword: {
  requireEmailVerification: true,  // Blocks login until verified
  autoSignIn: false,               // Don't auto-login after setup
}

emailVerification: {
  sendOnSignUp: true,              // Auto-send email on user creation
  sendVerificationEmail: async ({ user, token }) => {
    // Custom setup email with token
  }
}

onPasswordReset: async ({ user }) => {
  // Mark email verified and password changed
}
```

### Client (setup-account/page.tsx)
- Uses Better Auth's `/api/auth/verify-email` endpoint
- Passes token from URL and new password
- Handles errors (expired token, invalid token)

## Edge Cases Handled

1. **Expired Token**: Better Auth returns error, user sees "This link has expired"
2. **Invalid Token**: Better Auth returns error, user sees "Invalid setup link"
3. **Already Verified**: User can still reset password if needed
4. **First User**: Automatically promoted to admin, email marked verified, no setup email sent

## Benefits of This Approach

1. **Native Better Auth**: Uses framework's built-in verification system
2. **Secure**: Tokens are cryptographically secure and time-limited
3. **Automatic**: Email sent automatically when user created
4. **Clean**: No manual token generation or storage
5. **Consistent**: Same flow for all verification scenarios

## API Endpoints Used

- `POST /api/auth/verify-email` - Verify email with token and set password
- `POST /api/admin/users` - Admin creates user (triggers email)

## Database Changes

When user completes setup:
- `emailVerified`: `false` → `true`
- `mustChangePassword`: `true` → `false`
- Token removed from `verification` table (Better Auth handles this)
