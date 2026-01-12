# Final Solution - Password Reset Token Issue

## Problem
Users couldn't reset their passwords, getting a 400 Bad Request error when trying to set up their account password.

## Root Cause
The application was trying to manually validate Better Auth's JWT tokens by looking them up in the database, but Better Auth uses JWT tokens (not database-stored tokens) for password reset functionality.

**Key Discovery:**
- Better Auth generates JWT tokens like: `eyJhbGciOiJIUzI1NiJ9...`
- These JWTs contain email and expiry info, not a database token ID
- The database stores separate verification records with identifiers like `reset-password:<id>`
- The JWT and database records are NOT directly linked by value

## The Solution

### 1. Use Better Auth's API (Server-Side)
Instead of manually validating tokens, delegate to Better Auth's `resetPassword` API which handles JWT validation internally.

**File:** `apps/server/src/api/routes/accounts/setup-account.handlers.ts`

```typescript
// ✅ CORRECT - Use Better Auth's API
const { auth } = await import('@/lib/auth_');

await auth.api.resetPassword({
  body: {
    newPassword: password,
    token: token, // JWT token from URL
  },
});

// Then update user flags
await db.update(schema.users).set({
  mustChangePassword: false,
  emailVerified: true,
  updatedAt: new Date(),
}).where(eq(schema.users.id, user.id));
```

### 2. Use Custom Endpoint (Client-Side)
Call the custom `/api/accounts/setup-password` endpoint instead of Better Auth's default endpoint.

**File:** `apps/client/app/(auth)/setup-account/page.tsx`

```typescript
// ✅ CORRECT - Use custom endpoint
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

## Why This Works

1. **JWT Validation**: Better Auth's `resetPassword` API validates the JWT signature and expiry
2. **Email Extraction**: Better Auth extracts the email from the JWT payload
3. **Password Update**: Better Auth handles password hashing and storage
4. **Custom Logic**: We can still add custom logic (like updating `mustChangePassword` flag) after Better Auth completes

## Key Learnings

### ❌ Don't Do This
```typescript
// Trying to manually look up JWT tokens in database
const verification = await db.query.verification.findFirst({
  where: eq(schema.verification.value, jwtToken) // Won't work!
});
```

### ✅ Do This Instead
```typescript
// Let Better Auth handle JWT validation
await auth.api.resetPassword({
  body: { newPassword: password, token: jwtToken }
});
```

## Testing

### Test Case 1: New User Setup
1. Admin creates user → User receives setup email
2. User clicks link → Opens setup page with JWT token
3. User enters password → Calls `/api/accounts/setup-password`
4. Server validates JWT via Better Auth → Password set successfully
5. User can sign in ✅

### Test Case 2: User Recreation
1. Delete user from database
2. Recreate user with same email
3. User receives new setup email with new JWT
4. User can set password successfully ✅

## Files Modified

1. **apps/server/src/api/routes/accounts/setup-account.handlers.ts**
   - Removed manual token lookup
   - Added Better Auth API integration
   - Simplified to ~60 lines from ~150 lines

2. **apps/client/app/(auth)/setup-account/page.tsx**
   - Changed from `authClient.resetPassword()` to custom endpoint
   - Added proper error handling

3. **apps/server/src/lib/auth_.ts**
   - Enhanced logging for debugging
   - Added token cleanup on user creation

## Debug Tools Created

For future debugging:
- `check-verification-tokens.ts` - Inspect database tokens
- `cleanup-verification-tokens.ts` - Clean up old tokens
- `decode-reset-token.ts` - Decode JWT tokens

## Success Metrics

✅ Password reset works for new users
✅ Password reset works after user deletion/recreation
✅ Proper error messages for expired tokens
✅ Enhanced logging for debugging
✅ Simplified codebase (removed 90+ lines of complex token lookup logic)

## Conclusion

The key insight was understanding that Better Auth uses **JWT-based password reset**, not database-stored tokens. By delegating token validation to Better Auth's API instead of trying to manually validate JWTs, we achieved a simpler, more reliable solution that works seamlessly with Better Auth's architecture.
