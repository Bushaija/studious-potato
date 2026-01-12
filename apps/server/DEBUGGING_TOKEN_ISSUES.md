# Debugging Invalid Token Issues

## Problem
When recreating a user with the same email after deletion, the verification token becomes invalid.

## Root Cause Discovered
Better Auth stores reset password tokens with a special identifier format: `reset-password:<token>` instead of using the user's email as the identifier. This means we need to look up tokens by their value, not by email identifier.

## Changes Made

### 1. Enhanced Logging in `auth_.ts`
- Added logging for token cleanup (shows how many old tokens were deleted)
- Added verification after token creation to ensure it was created successfully
- Added small delays (100ms) to prevent race conditions between cleanup and creation

### 2. Fixed Token Lookup in `setup-account.handlers.ts`
- Changed token lookup to search by token value instead of email identifier
- Better Auth uses `reset-password:<token>` as identifier, not the email
- Added detailed logging when token validation fails
- Shows whether token exists, matches, or is expired
- Provides specific error messages for different failure scenarios

### 3. Fixed Client-Side Endpoint in `setup-account/page.tsx`
- Changed from using Better Auth's `resetPassword()` to custom `/api/accounts/setup-password` endpoint
- Properly passes token, email, and password to the custom endpoint

### 4. Debug Scripts

#### Check Verification Tokens
```bash
# Check all tokens
cd apps/server
npx tsx src/scripts/check-verification-tokens.ts

# Check tokens for specific email
npx tsx src/scripts/check-verification-tokens.ts mugisharobertx@gmail.com
```

#### Cleanup Verification Tokens
```bash
# Clean up expired tokens only
cd apps/server
npx tsx src/scripts/cleanup-verification-tokens.ts expired

# Clean up all tokens
npx tsx src/scripts/cleanup-verification-tokens.ts all

# Clean up tokens for specific email
npx tsx src/scripts/cleanup-verification-tokens.ts mugisharobertx@gmail.com
```

## Debugging Steps

### Step 1: Check Server Logs
When creating a user, look for these log messages:
```
[Auth Hook] User created: <email>, sending setup email
[Auth Hook] Cleaned up X old verification token(s) for <email>
[Auth Hook] Setup email sent to: <email>, token expires at: <timestamp>
```

If you see:
```
[Auth Hook] WARNING: No verification token found for <email> after forgetPassword call
```
This indicates Better Auth failed to create the token.

### Step 2: Check Database Tokens
Run the check script to see what tokens exist:
```bash
npx tsx src/scripts/check-verification-tokens.ts mugisharobertx@gmail.com
```

Look for:
- Multiple tokens for the same email (should only be 1)
- Expired tokens
- Token value mismatch

### Step 3: Check Setup Password Logs
When the user tries to set their password, look for:
```
[Setup Password] Attempting to setup password for email: <email>
[Setup Password] Valid token found for <email>, expires at: <timestamp>
```

If you see error logs like:
```
[Setup Password] Token found but invalid for <email>
```
Check the details:
- `tokenMatch: false` - The token in the URL doesn't match the database
- `isExpired: true` - The token has expired
- `expiresAt` vs `now` - Shows when it expired

### Step 4: Common Issues and Solutions

#### Issue: Token doesn't match
**Cause**: The token in the email link is different from the database token
**Solution**: 
1. Check if multiple emails were sent
2. Ensure user is using the latest email
3. Check email service logs

#### Issue: Token expired
**Cause**: Token has a 10-minute expiration (Better Auth default)
**Solution**:
1. User needs to request a new setup link
2. Consider increasing token expiration in Better Auth config

#### Issue: No token found
**Cause**: Token was deleted or never created
**Solution**:
1. Check if user was deleted and recreated
2. Run cleanup script and recreate user
3. Check Better Auth configuration

#### Issue: Multiple tokens exist
**Cause**: Race condition or failed cleanup
**Solution**:
```bash
# Clean up tokens for the email
npx tsx src/scripts/cleanup-verification-tokens.ts <email>

# Then trigger a new setup email (recreate user or use admin panel)
```

## Prevention

### Before Recreating a User
1. Clean up verification tokens:
```bash
npx tsx src/scripts/cleanup-verification-tokens.ts <email>
```

2. Delete the user from database

3. Create the new user

### Monitoring
Check for orphaned tokens regularly:
```bash
# Check for expired tokens
npx tsx src/scripts/check-verification-tokens.ts

# Clean them up
npx tsx src/scripts/cleanup-verification-tokens.ts expired
```

## Better Auth Token Configuration

Current configuration in `auth_.ts`:
- Token expiration: 10 minutes (Better Auth default)
- Token type: Password reset token
- Cleanup: Automatic on user creation

To change token expiration, add to Better Auth config:
```typescript
emailAndPassword: {
  // ... other config
  resetPasswordTokenExpiresIn: 60 * 60, // 1 hour in seconds
}
```

## Testing the Fix

1. Create a test user:
```bash
# Via your admin panel or API
POST /api/admin/users
{
  "email": "test@example.com",
  "name": "Test User",
  "role": "accountant"
}
```

2. Check the logs for token creation

3. Check the database:
```bash
npx tsx src/scripts/check-verification-tokens.ts test@example.com
```

4. Try to set password using the link

5. Delete the user and repeat steps 1-4

If the issue persists after these changes, the problem might be:
- Email service sending old cached emails
- Browser caching the old token URL
- Database replication lag (if using replicas)
