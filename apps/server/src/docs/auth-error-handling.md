# Authentication Error Handling

This document explains the comprehensive error handling system implemented for Better Auth in this application.

## Overview

The error handling system provides:
- User-friendly error messages while maintaining security
- Consistent error handling across the application
- Detailed logging for debugging in development
- Actionable error responses with contextual help

## Architecture

### 1. Error Mapping (`lib/auth-errors.ts`)

The core of the system maps authentication errors to user-friendly messages:

```typescript
import { handleAuthError } from '@/lib/auth-errors'

// Automatically maps error codes and HTTP status to user-friendly messages
const errorInfo = handleAuthError(errorContext)
```

**Key Features:**
- Maps specific error codes (e.g., `USER_NOT_FOUND`, `INVALID_PASSWORD`)
- Handles HTTP status codes (401, 403, 429, 500, etc.)
- Provides actionable suggestions (reset password, contact support)
- Includes severity levels (error, warning, info)

### 2. Custom Hooks (`hooks/use-auth-error.ts`)

Provides reusable error handling hooks for different authentication scenarios:

```typescript
import { useSignInError, useSignUpError, usePasswordResetError } from '@/hooks/use-auth-error'

// Specialized hooks with context-specific handling
const { handleError, handleSuccess } = useSignInError()
```

**Available Hooks:**
- `useSignInError()` - Sign-in specific error handling
- `useSignUpError()` - Registration error handling  
- `usePasswordResetError()` - Password reset handling
- `useAuthStateError()` - General auth state errors
- `useAuthError(options)` - Base hook for custom scenarios

### 3. Enhanced Auth Configuration (`lib/auth.ts`)

Better Auth configuration enhanced with:
- Rate limiting to prevent brute force attacks
- Enhanced password validation
- Security callbacks for error logging
- Failed attempt tracking

## Error Types and Messages

### User Account Errors

| Error Code | User Message | Action |
|------------|--------------|---------|
| `USER_NOT_FOUND` | "Account not found" | Link to sign up |
| `INVALID_PASSWORD` | "Incorrect password" | Reset password link |
| `EMAIL_NOT_VERIFIED` | "Email not verified" | Resend verification |
| `ACCOUNT_LOCKED` | "Account temporarily locked" | Contact support |

### Security Errors

| Error Code | User Message | Action |
|------------|--------------|---------|
| `TOO_MANY_REQUESTS` | "Too many attempts" | Wait before retry |
| `WEAK_PASSWORD` | "Password update required" | Reset password |

### System Errors

| HTTP Status | User Message | Action |
|-------------|--------------|---------|
| 401 | "Authentication failed" | Reset password |
| 403 | "Access denied" | Contact support |
| 429 | "Too many requests" | Wait and retry |
| 500 | "Server error" | Retry later |

## Usage Examples

### Basic Sign-In Error Handling

```typescript
import { useSignInError } from '@/hooks/use-auth-error'

export default function SignInPage() {
    const { handleError, handleSuccess } = useSignInError()
    
    const handleSubmit = async (data) => {
        await authClient.signIn.email(data, {
            onSuccess: handleSuccess,
            onError: handleError
        })
    }
}
```

### Custom Error Handling

```typescript
import { useAuthError } from '@/hooks/use-auth-error'

const { handleError } = useAuthError({
    showToast: true,
    logErrors: true,
    onError: (errorInfo, ctx) => {
        // Custom error handling logic
        if (errorInfo.severity === 'error') {
            // Track error in analytics
            analytics.track('auth_error', { code: errorInfo.code })
        }
    }
})
```

### Manual Error Processing

```typescript
import { handleAuthError, extractErrorDetails } from '@/lib/auth-errors'

// Get error info without displaying UI
const errorInfo = handleAuthError(errorContext)

// Extract raw error details for logging
const details = extractErrorDetails(errorContext)
console.log('Error details:', details)
```

## Security Considerations

### 1. User Enumeration Prevention

The system prevents revealing whether a user exists:
- Generic messages for `USER_NOT_FOUND` vs `INVALID_PASSWORD`
- Consistent timing for both scenarios
- No specific details in error responses

### 2. Rate Limiting

Built-in protection against brute force attacks:
- 5 attempts per minute per IP
- Progressive delays for repeated failures
- Account locking after excessive attempts

### 3. Information Disclosure

- Detailed errors only logged in development
- Generic error messages in production
- No stack traces exposed to clients
- Sensitive data filtered from logs

## Development vs Production

### Development Mode
- Detailed console logging
- Full error context in logs
- Stack traces available
- Verbose error messages

### Production Mode
- Minimal error exposure
- Generic user messages
- Secure error logging
- Rate limiting enforced

## Best Practices

### 1. Use Specialized Hooks

```typescript
// ✅ Good - Use specialized hooks
const { handleError } = useSignInError()

// ❌ Avoid - Generic error handling
catch (error) {
    toast.error('Login failed')
}
```

### 2. Provide Actionable Messages

```typescript
// ✅ Good - Actionable error with suggestion
{
    title: "Email not verified",
    description: "Please verify your email address before signing in.",
    action: { label: "Resend Verification", href: "/verify-email" }
}

// ❌ Avoid - Vague error messages
{
    title: "Error",
    description: "Something went wrong"
}
```

### 3. Handle Network Errors

```typescript
// ✅ Good - Specific network error handling
if (message.includes('network')) {
    return {
        title: "Connection problem",
        description: "Please check your internet connection and try again."
    }
}
```

### 4. Log for Debugging

```typescript
// ✅ Good - Structured logging
console.error('Authentication error:', {
    code: errorDetails.code,
    status: errorDetails.status,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
})
```

## Extending the System

### Adding New Error Types

1. **Add to error mapping:**
```typescript
// lib/auth-errors.ts
export const AUTH_ERROR_MAP = {
    'NEW_ERROR_CODE': {
        title: "Clear title",
        description: "Helpful description with next steps",
        action: { label: "Action", href: "/path" },
        canRetry: false,
        severity: 'error'
    }
}
```

2. **Create specialized hook if needed:**
```typescript
// hooks/use-auth-error.ts
export function useNewFeatureError() {
    return useAuthError({
        onSuccess: () => {
            // Custom success handling
        },
        onError: (errorInfo) => {
            // Custom error handling
        }
    })
}
```

### Custom Error Processing

```typescript
const { getErrorInfo } = useAuthError({ showToast: false })

// Process error manually
const errorInfo = getErrorInfo(errorContext)
if (errorInfo.severity === 'warning') {
    // Show different UI for warnings
    showWarningBanner(errorInfo.description)
} else {
    // Handle errors differently
    showErrorModal(errorInfo)
}
```

## Troubleshooting

### Common Issues

1. **Generic error messages in development**
   - Check console for detailed error logs
   - Verify error codes are being returned from server
   - Ensure Better Auth is configured correctly

2. **Toast notifications not showing**
   - Verify `sonner` toast provider is set up
   - Check if `showToast: false` is set in hook options
   - Ensure hook is called within React component

3. **Rate limiting too aggressive**
   - Adjust `rateLimit.max` and `rateLimit.window` in auth config
   - Consider using database storage for rate limiting in production

4. **Missing error actions**
   - Verify routes exist for action hrefs (e.g., `/forgot-password`)
   - Check if action handlers are properly implemented

## Migration Guide

### From Basic Error Handling

**Before:**
```typescript
onError: (ctx) => {
    toast.error("Login failed", {
        description: "Invalid email or password"
    })
}
```

**After:**
```typescript
const { handleError } = useSignInError()

onError: handleError
```

### Benefits
- Consistent error messages across the app
- Better user experience with actionable errors
- Improved security with proper error sanitization
- Easier maintenance and testing

## Testing

### Unit Tests

```typescript
import { mapAuthError } from '@/lib/auth-errors'

test('should map USER_NOT_FOUND error correctly', () => {
    const errorInfo = mapAuthError({ code: 'USER_NOT_FOUND' })
    expect(errorInfo.title).toBe('Account not found')
    expect(errorInfo.action?.href).toBe('/signup')
})
```

### Integration Tests

```typescript
import { useSignInError } from '@/hooks/use-auth-error'

test('should handle sign-in error and show toast', async () => {
    const { handleError } = useSignInError()
    
    // Simulate error
    handleError(mockErrorContext)
    
    // Assert toast is shown
    expect(screen.getByText('Account not found')).toBeInTheDocument()
})
```

This error handling system provides a robust foundation for authentication in the application while maintaining security best practices and providing excellent user experience. 