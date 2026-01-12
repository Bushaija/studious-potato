/**
 * Extended Better Auth types for the client
 * 
 * These types extend the default Better Auth session and user types
 * to include custom fields defined in the backend auth configuration.
 */

/**
 * Extended user type with custom fields
 */
export interface ExtendedUser {
  id: string
  email: string
  emailVerified: boolean
  name: string
  image?: string | null
  createdAt: Date
  updatedAt: Date
  role?: string
  facilityId?: number | null
  permissions?: string | null
  projectAccess?: string | null
  configAccess?: string | null
  lastLoginAt?: Date | null
  isActive?: boolean
  createdBy?: number | null
  mustChangePassword?: boolean
  banned?: boolean | null
  banReason?: string | null
  banExpires?: Date | null
}

/**
 * Extended session type
 */
export interface ExtendedSession {
  session: {
    id: string
    userId: string
    expiresAt: Date
    token: string
    ipAddress?: string | null
    userAgent?: string | null
  }
  user: ExtendedUser
}

/**
 * Type guard to check if a user has mustChangePassword flag
 */
export function userMustChangePassword(user: any): user is ExtendedUser & { mustChangePassword: true } {
  return user && typeof user === 'object' && user.mustChangePassword === true
}
