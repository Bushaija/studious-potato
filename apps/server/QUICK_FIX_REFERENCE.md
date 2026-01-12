# Quick Fix Reference - Invalid Token Issue

## The Problem
```
POST http://localhost:9999/api/auth/reset-password 400 (Bad Request)
```

## The Root Causes
1. ❌ Client calling wrong endpoint (`/api/auth/reset-password` instead of `/api/accounts/setup-password`)
2. ❌ Server looking up tokens by email identifier instead of token value
3. ❌ Better Auth uses `reset-password:<id>` format, not email as identifier

## The Fix (3 Changes)

### Change 1: Client Endpoint
**File:** `apps/client/app/(auth)/setup-account/page.tsx`

```typescript
// ❌ OLD - Wrong endpoint
const { authClient } = await import('@/lib/auth')
const result = await authClient.resetPassword({ newPassword: password, token: token! })

// ✅ NEW - Correct custom endpoint
const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/accounts/setup-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: token!, email: email!, password: password }),
})
```

### Change 2: Token Lookup
**File:** `apps/server/src/api/routes/accounts/setup-account.handlers.ts`

```typescript
// ❌ OLD - Looking by email identifier
const verification = await db.query.verification.findFirst({
  where: and(
    eq(schema.verification.identifier, email),  // Wrong!
    eq(schema.verification.value, token),
    gt(schema.verification.expiresAt, new Date())
  ),
});

// ✅ NEW - Looking by token value only
const verification = await db.query.verification.findFirst({
  where: and(
    eq(schema.verification.value, token),  // Correct!
    gt(schema.verification.expiresAt, new Date())
  ),
});
```

### Change 3: Enhanced Logging
**File:** `apps/server/src/lib/auth_.ts`

Added logging to track token lifecycle and cleanup.

## Quick Test

```bash
# 1. Clean up old tokens
cd apps/server
npx tsx src/scripts/cleanup-verification-tokens.ts expired

# 2. Check current tokens
npx tsx src/scripts/check-verification-tokens.ts

# 3. Create a user and test password setup
# (Use your admin panel or API)

# 4. Check logs for success messages
```

## Success Indicators

✅ Client calls `/api/accounts/setup-password`
✅ Server finds token by value, not email
✅ Logs show: `[Setup Password] Valid token found`
✅ Password setup completes successfully
✅ Works even after deleting and recreating user

## If Still Failing

```bash
# Check what tokens exist
npx tsx src/scripts/check-verification-tokens.ts <email>

# Clean up and retry
npx tsx src/scripts/cleanup-verification-tokens.ts <email>

# Check server logs for detailed error messages
```

## Key Learning
Better Auth stores reset tokens with identifier `reset-password:<random-id>`, NOT the user's email. Always look up by token value!
