# Budget Monitoring API Documentation

## Overview

The Budget Monitoring API provides authentication and user management capabilities for budget monitoring systems. This RESTful API supports user registration, authentication, profile management, and password recovery operations.

**API Version:** 1.0.0  
**Base URL:** `https://your-domain.com`

## Authentication

The API uses session-based authentication with JWT tokens. Most endpoints require authentication via session tokens obtained through the sign-in process.

### Authentication Flow

1. Register a new user account via `/api/auth/sign-up`
2. Sign in using credentials via `/api/auth/sign-in` to receive a session token
3. Include the session token in subsequent API requests
4. Use `/api/auth/session` to validate current session status

## User Roles

The system supports three user roles with different access levels:

- **accountant** - Financial data access and management
- **program_manager** - Program oversight and budget monitoring
- **admin** - Full system administration (response only)

## API Endpoints

### Authentication

#### Register User

Creates a new user account in the system.

**Endpoint:** `POST /api/auth/sign-up`

**Request Body:**
```json
{
  "name": "string",           // Required, minimum 2 characters
  "email": "string",          // Required, valid email format
  "password": "string",       // Required, minimum 8 characters
  "role": "string",          // Required, enum: accountant | program_manager
  "facilityId": "number"     // Optional
}
```

**Success Response (201):**
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "role": "accountant | admin | program_manager",
    "facilityId": "number | null",
    "permissions": "object | null",
    "projectAccess": "number[] | null",
    "isActive": "boolean",
    "lastLoginAt": "string | null"
  },
  "session": {
    "id": "string",
    "token": "string",
    "expiresAt": "string"
  }
}
```

**Error Responses:**
- `400` - Invalid input data with field-specific error messages
- `409` - User already exists

---

#### Sign In

Authenticates a user and creates a new session.

**Endpoint:** `POST /api/auth/sign-in`

**Request Body:**
```json
{
  "email": "string",        // Required, valid email format
  "password": "string",     // Required
  "rememberMe": "boolean"   // Optional
}
```

**Success Response (200):**
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "role": "accountant | admin | program_manager",
    "facilityId": "number | null",
    "permissions": "object | null",
    "projectAccess": "number[] | null",
    "isActive": "boolean",
    "lastLoginAt": "string | null"
  },
  "session": {
    "id": "string",
    "token": "string",
    "expiresAt": "string"
  },
  "mustChangePassword": "boolean",  // Optional
  "message": "string"               // Optional
}
```

**Error Responses:**
- `401` - Invalid credentials
- `403` - Account deactivated

---

#### Sign Out

Terminates the current user session.

**Endpoint:** `POST /api/auth/sign-out`

**Success Response (200):**
```json
{
  "message": "string"
}
```

---

#### Get Current Session

Retrieves information about the current authenticated session.

**Endpoint:** `GET /api/auth/session`

**Success Response (200):**
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "role": "accountant | admin | program_manager",
    "facilityId": "number | null",
    "permissions": "object | null",
    "projectAccess": "number[] | null",
    "isActive": "boolean",
    "lastLoginAt": "string | null"
  },
  "session": {
    "id": "string",
    "token": "string",
    "expiresAt": "string"
  },
  "mustChangePassword": "boolean"
}
```

**Error Responses:**
- `401` - Not authenticated
- `403` - Account deactivated

---

### Profile Management

#### Update Profile

Updates the current user's profile information.

**Endpoint:** `PUT /api/auth/profile`

**Request Body:**
```json
{
  "name": "string",           // Optional, minimum 2 characters
  "email": "string",          // Optional, valid email format
  "currentPassword": "string", // Required if changing password
  "newPassword": "string"     // Optional, minimum 8 characters
}
```

**Success Response (200):**
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "role": "accountant | admin | program_manager",
    "facilityId": "number | null",
    "permissions": "object | null",
    "projectAccess": "number[] | null",
    "isActive": "boolean",
    "lastLoginAt": "string | null"
  },
  "message": "string"
}
```

**Error Responses:**
- `400` - Invalid input data
- `401` - Authentication required

---

### Password Recovery

#### Request Password Reset

Initiates the password reset process by sending a reset email.

**Endpoint:** `POST /api/auth/forgot-password`

**Request Body:**
```json
{
  "email": "string"  // Required, valid email format
}
```

**Success Response (200):**
```json
{
  "message": "string"
}
```

**Error Responses:**
- `400` - Invalid email format

---

#### Reset Password

Completes the password reset process with a new password.

**Endpoint:** `POST /api/auth/reset-password`

**Request Body:**
```json
{
  "email": "string",      // Required, valid email format
  "newPassword": "string" // Required, minimum 8 characters
}
```

**Success Response (200):**
```json
{
  "message": "string"
}
```

**Error Responses:**
- `400` - Invalid data

---

#### Verify Email

Verifies user email address using OTP code.

**Endpoint:** `POST /api/auth/verify-email`

**Request Body:**
```json
{
  "email": "string",  // Required, valid email format
  "otp": "string"     // Required, exactly 6 characters
}
```

**Success Response (200):**
```json
{
  "message": "string"
}
```

## Error Handling

All error responses follow a consistent format:

```json
{
  "message": "string",    // Human-readable error message
  "errors": [             // Optional array of field-specific errors
    {
      "field": "string",  // Field name that caused the error
      "message": "string" // Specific error message for the field
    }
  ]
}
```

## HTTP Status Codes

- `200` - Success
- `201` - Created successfully
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (access denied or account deactivated)
- `409` - Conflict (resource already exists)

## Data Models

### User Object

```json
{
  "id": "string",                    // Unique user identifier
  "name": "string",                  // User's display name
  "email": "string",                 // User's email address
  "role": "string",                  // User role (accountant|admin|program_manager)
  "facilityId": "number | null",     // Associated facility ID
  "permissions": "object | null",    // User-specific permissions
  "projectAccess": "number[] | null", // Array of accessible project IDs
  "isActive": "boolean",             // Account activation status
  "lastLoginAt": "string | null"     // Last login timestamp
}
```

### Session Object

```json
{
  "id": "string",      // Unique session identifier
  "token": "string",   // JWT session token
  "expiresAt": "string" // Session expiration timestamp
}
```

## Security Considerations

- All passwords must meet minimum length requirements (8 characters)
- Email addresses are validated for proper format
- Sessions have expiration timestamps for automatic logout
- Account deactivation prevents access while preserving data
- OTP verification is required for email confirmation

## Rate Limiting

Please implement appropriate rate limiting on your client to prevent abuse, especially for authentication endpoints.

## Support

For API support and questions, please contact your system administrator.