# Token Issue Fix Summary

## Problem Statement
When a user was deleted and recreated with the same email, the password setup token would become invalid, resulting in a 400 Bad Request error.

## Root Cause Analysis

### Issue 1: Wrong Endpoint
The client was calling Better Auth's `/api/auth/reset-password` endpoint instead of the custom `/api/accounts/setup-password` endpoint.

**Evidence:**
```
Request URL: http://localhost:9999/api/auth/reset-password
Payload: {"newPassword": "...", "token": "..."}
```

### Issue 2: Token Identifier Mismatch
Better Auth stores reset password tokens with a special identifier format:
- **Expected:** `email@example.com`
- **Actual:** `reset-password:<random-token-id>`

**Evidence from database:**
```
Token 1:
Email: reset-password:NhV0kFrvRwmJyLOyqEMX6H1E
Value: 3...
```

The handler was looking up tokens by email identifier, but Better Auth uses a different format.

## Solutions Implemented

### 1. Fixed Client-Side Endpoint (apps/client/app/(auth)/setup-account/page.tsx)

**Before:**
```typescript
const { authClient } = await import('@/lib/auth')
const result = await authClient.resetPassword({
    newPassword: password,
    token: token!,
})
```

**After:**
```typescript
const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/accounts/setup-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        token: token!,
        email: email!,
        password: password,
    }),
})
```

### 2. Fixed Token Lookup (apps/server/src/api/routes/accounts/setup-account.handlers.ts)

**Before:**
```typescript
const verification = await db.query.verification.findFirst({
  where: and(
    eq(schema.verification.identifier, email),  // ❌ Wrong: looking by email
    eq(schema.verification.value, token),
    gt(schema.verification.expiresAt, new Date())
  ),
});
```

**After:**
```typescript
const verification = await db.query.verification.findFirst({
  where: and(
    eq(schema.verification.value, token),  // ✅ Correct: looking by token value
    gt(schema.verification.expiresAt, new Date())
  ),
});
```

### 3. Enhanced Logging

Added comprehensive logging to track token lifecycle:

**In auth_.ts (user creation):**
- Logs token cleanup count
- Logs token creation success
- Verifies token exists after creation

**In setup-account.handlers.ts (password setup):**
- Logs token lookup attempts
- Shows token identifier format
- Provides detailed error messages

### 4. Added Debug Tools

Created three scripts for debugging:

1. **check-verification-tokens.ts** - Inspect tokens in database
   ```bash
   npx tsx src/scripts/check-verification-tokens.ts [email]
   ```

2. **cleanup-verification-tokens.ts** - Clean up old tokens
   ```bash
   npx tsx src/scripts/cleanup-verification-tokens.ts [email|all|expired]
   ```

3. **decode-reset-token.ts** - Decode JWT tokens
   ```bash
   npx tsx src/scripts/decode-reset-token.ts <token>
   ```

## Testing the Fix

### Step 1: Clean Up Old Tokens
```bash
cd apps/server
npx tsx src/scripts/cleanup-verification-tokens.ts expired
```

### Step 2: Create a Test User
Use your admin panel or API to create a user with email `test@example.com`

### Step 3: Check Server Logs
Look for these messages:
```
[Auth Hook] User created: test@example.com, sending setup email
[Auth Hook] Cleaned up 0 old verification token(s) for test@example.com
[Auth Hook] Setup email sent to: test@example.com, token expires at: ...
```

### Step 4: Verify Token in Database
```bash
npx tsx src/scripts/check-verification-tokens.ts test@example.com
```

Expected output:
```
Token 1:
  Email: reset-password:<some-id>
  Value: <jwt-token>
  Expires At: <timestamp>
  Status: VALID
```

### Step 5: Test Password Setup
1. Open the setup link from the email
2. Enter a password
3. Check server logs for:
   ```
   [Setup Password] Attempting to setup password for email: test@example.com
   [Setup Password] Valid token found, identifier: reset-password:..., expires at: ...
   [Setup Account] Password set successfully for user: test@example.com
   ```

### Step 6: Test User Recreation
1. Delete the user from database
2. Recreate with the same email
3. Repeat steps 3-5

## Expected Behavior After Fix

✅ Token lookup works correctly regardless of Better Auth's identifier format
✅ Custom endpoint is used for password setup
✅ Detailed logs show exactly what's happening
✅ User can be deleted and recreated without token issues
✅ Clear error messages when tokens are invalid or expired

## Key Takeaways

1. **Better Auth Token Format**: Reset password tokens use `reset-password:<id>` as identifier, not the email
2. **Token Lookup**: Always search by token value, not by identifier
3. **Custom Endpoints**: Use custom endpoints when you need specific behavior beyond Better Auth's defaults
4. **Logging**: Comprehensive logging is essential for debugging authentication issues
5. **Debug Tools**: Having scripts to inspect and clean up tokens saves debugging time

## Files Modified

1. `apps/client/app/(auth)/setup-account/page.tsx` - Use custom endpoint
2. `apps/server/src/api/routes/accounts/setup-account.handlers.ts` - Fix token lookup
3. `apps/server/src/lib/auth_.ts` - Enhanced logging
4. `apps/server/src/scripts/check-verification-tokens.ts` - New debug script
5. `apps/server/src/scripts/cleanup-verification-tokens.ts` - New cleanup script
6. `apps/server/src/scripts/decode-reset-token.ts` - New decode script
7. `apps/server/DEBUGGING_TOKEN_ISSUES.md` - Comprehensive debugging guide

## Next Steps

1. Test the fix with the steps above
2. Monitor logs during user creation and password setup
3. If issues persist, use the debug scripts to inspect tokens
4. Consider adding automated tests for this flow
