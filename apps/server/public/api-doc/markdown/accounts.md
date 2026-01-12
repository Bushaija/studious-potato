# User Account Management API

This documentation covers the user account management endpoints for enhanced user registration and ban functionality.

## Authentication

All endpoints require proper authentication. The ban/unban endpoints specifically require session cookies to be present in the request headers.

---

## Endpoints

### 1. Enhanced User Registration

Creates a new user account with comprehensive configuration options including role assignment, facility association, and permission settings.

**Endpoint:** `POST /api/accounts/sign-up`

**Tags:** `accounts`

#### Request Body

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `string` | ✅ | User's full name (minimum 2 characters) |
| `email` | `string` | ✅ | Valid email address |
| `password` | `string` | ✅ | Password (minimum 8 characters) |
| `role` | `string` | ❌ | User role: `admin`, `accountant`, `project_manager` |
| `facilityId` | `number` | ❌ | Associated facility identifier |
| `permissions` | `string` | ❌ | JSON string array of permissions (e.g., `["view_reports", "edit_budget"]`) |
| `projectAccess` | `string` | ❌ | JSON string array of project IDs (e.g., `[1, 2, 3]`) |
| `mustChangePassword` | `boolean` | ❌ | Whether user must change password on first login |
| `isActive` | `boolean` | ❌ | Account active status |
| `banned` | `boolean` | ❌ | Whether user is banned |
| `banReason` | `string` | ❌ | Reason for ban (required if `banned` is true) |
| `banExpires` | `string` | ❌ | Ban expiration date (ISO 8601 format) |

#### Example Request

```json
{
  "name": "John Smith",
  "email": "john.smith@example.com",
  "password": "SecurePass123!",
  "role": "project_manager",
  "facilityId": 2,
  "permissions": "[\"view_reports\", \"edit_budget\"]",
  "projectAccess": "[1, 3, 5]",
  "mustChangePassword": true,
  "isActive": true,
  "banned": false
}
```

#### Response

**Success (201 Created)**

```json
{
  "user": {
    "id": "18",
    "name": "John Smith",
    "email": "john.smith@example.com",
    "role": "project_manager",
    "facilityId": 2,
    "permissions": "[\"view_reports\", \"edit_budget\"]",
    "projectAccess": "[1, 3, 5]",
    "isActive": true,
    "mustChangePassword": true,
    "banned": false,
    "banReason": null,
    "banExpires": null,
    "lastLoginAt": null,
    "createdAt": "2025-09-14T05:33:05.829Z",
    "updatedAt": "2025-09-14T05:33:05.829Z"
  },
  "session": {
    "id": "session_id",
    "token": "FCgtnGmBAYdnXCvaiTv7m2Y4zk0wfEoA",
    "expiresAt": "2025-09-21T05:33:05.864Z"
  }
}
```

#### Error Responses

**400 Bad Request** - Invalid input data
```json
{
  "message": "Invalid input data provided",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address"
    }
  ]
}
```

**403 Forbidden** - Signup disabled or insufficient permissions
```json
{
  "message": "Public registration is disabled. Please contact an administrator to create your account.",
  "code": "SIGNUP_DISABLED"
}
```

**409 Conflict** - User already exists
```json
{
  "message": "User with this email already exists",
  "code": "USER_EXISTS"
}
```

---

### 2. Ban User

Bans a user account, preventing login and access to the system. Supports both temporary and permanent bans.

**Endpoint:** `POST /api/accounts/ban-user`

**Tags:** `User Management`

**Authentication:** Required (Session cookies)

#### Request Body

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | `string\|number` | ✅ | User identifier to ban |
| `banReason` | `string` | ✅ | Reason for banning (minimum 1 character) |
| `banExpiresIn` | `number` | ❌ | Ban duration in seconds (for temporary ban) |
| `banExpiresAt` | `string` | ❌ | Specific ban expiration date (ISO 8601 format) |

> **Note:** Cannot specify both `banExpiresIn` and `banExpiresAt`. Omit both for permanent ban.

#### Example Requests

**Temporary Ban (Duration)**
```json
{
  "userId": 123,
  "banReason": "Spamming users",
  "banExpiresIn": 604800
}
```

**Temporary Ban (Specific Date)**
```json
{
  "userId": 123,
  "banReason": "Policy violation",
  "banExpiresAt": "2025-12-31T23:59:59.000Z"
}
```

**Permanent Ban**
```json
{
  "userId": 123,
  "banReason": "Severe terms of service violation"
}
```

#### Response

**Success (200 OK)**

```json
{
  "success": true,
  "message": "User banned until 2025-09-21T05:33:05.829Z",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "banned": true,
    "banReason": "Spamming users",
    "banExpires": "2025-09-21T05:33:05.829Z"
  }
}
```

#### Error Responses

**400 Bad Request** - Invalid input data
```json
{
  "message": "Invalid banExpiresAt date format",
  "code": "VALIDATION_ERROR"
}
```

**403 Forbidden** - Insufficient permissions
```json
{
  "message": "Insufficient permissions to ban user",
  "code": "FORBIDDEN"
}
```

**404 Not Found** - User not found
```json
{
  "message": "User not found",
  "code": "USER_NOT_FOUND"
}
```

**409 Conflict** - User already banned
```json
{
  "message": "User is already banned",
  "code": "USER_ALREADY_BANNED"
}
```

---

### 3. Unban User

Removes ban from a user account, restoring access to the system.

**Endpoint:** `POST /api/accounts/unban-user`

**Tags:** `User Management`

**Authentication:** Required (Session cookies)

#### Request Body

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | `string\|number` | ✅ | User identifier to unban |
| `reason` | `string` | ❌ | Reason for unbanning (optional) |

#### Example Request

```json
{
  "userId": 123,
  "reason": "Appeal approved after review"
}
```

#### Response

**Success (200 OK)**

```json
{
  "success": true,
  "message": "User successfully unbanned",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "banned": false,
    "banReason": null,
    "banExpires": null
  }
}
```

#### Error Responses

**403 Forbidden** - Insufficient permissions
```json
{
  "message": "Insufficient permissions to unban user",
  "code": "FORBIDDEN"
}
```

**404 Not Found** - User not found
```json
{
  "message": "User not found",
  "code": "USER_NOT_FOUND"
}
```

**409 Conflict** - User not banned
```json
{
  "message": "User is not currently banned",
  "code": "USER_NOT_BANNED"
}
```

---

## Common Ban Duration Constants

For convenience, here are common ban durations in seconds:

| Duration | Seconds | Constant |
|----------|---------|----------|
| 1 Hour | 3,600 | `BAN_DURATIONS.ONE_HOUR` |
| 1 Day | 86,400 | `BAN_DURATIONS.ONE_DAY` |
| 1 Week | 604,800 | `BAN_DURATIONS.ONE_WEEK` |
| 1 Month | 2,592,000 | `BAN_DURATIONS.ONE_MONTH` |
| 3 Months | 7,776,000 | `BAN_DURATIONS.THREE_MONTHS` |
| 6 Months | 15,552,000 | `BAN_DURATIONS.SIX_MONTHS` |
| 1 Year | 31,536,000 | `BAN_DURATIONS.ONE_YEAR` |

---

## Security Considerations

1. **Authentication**: Ban/unban operations require proper session authentication
2. **Authorization**: Only users with administrative privileges should access ban functionality
3. **Audit Logging**: All ban/unban actions are logged for security auditing
4. **Rate Limiting**: Consider implementing rate limits on these sensitive operations
5. **Input Validation**: All inputs are validated and sanitized before processing

---

## Integration Notes

- The system integrates with better-auth for core authentication functionality
- Database consistency is maintained through dual updates (better-auth + local database)
- All timestamps are returned in ISO 8601 format (UTC)
- JSON string parameters (`permissions`, `projectAccess`) should be properly escaped
- Empty strings for optional date fields are handled gracefully

---

## Error Handling

All endpoints follow consistent error response formats:

- **HTTP Status Codes**: Standard codes (200, 201, 400, 403, 404, 409, 500)
- **Error Structure**: Consistent JSON structure with message, code, and optional error details
- **Validation Errors**: Field-specific error messages for validation failures
- **Logging**: Server-side logging for debugging and audit purposes