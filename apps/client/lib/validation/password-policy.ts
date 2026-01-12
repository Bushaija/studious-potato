/**
 * Password policy configuration
 * Defines the rules for acceptable passwords
 */
export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumber: boolean
  requireSpecialChar: boolean
  commonPasswordsCheck: boolean
}

/**
 * Default password policy
 * Can be overridden via environment variables if needed
 */
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  commonPasswordsCheck: true,
}

/**
 * Password requirement interface for UI display
 */
export interface PasswordRequirement {
  label: string
  met: boolean
  key: string
}

/**
 * Password strength levels
 */
export type PasswordStrength = 'weak' | 'medium' | 'strong'

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
  strength: PasswordStrength
  requirements: PasswordRequirement[]
}

/**
 * Error messages for password validation
 */
export const PASSWORD_ERROR_MESSAGES = {
  TOO_SHORT: 'Password must be at least 8 characters',
  NO_UPPERCASE: 'Password must contain at least one uppercase letter',
  NO_LOWERCASE: 'Password must contain at least one lowercase letter',
  NO_NUMBER: 'Password must contain at least one number',
  NO_SPECIAL: 'Password must contain at least one special character',
  COMMON_PASSWORD: 'This password is too common. Please choose a stronger password',
  INVALID_CURRENT: 'Current password is incorrect',
  TOKEN_EXPIRED: 'Reset link has expired. Please request a new one',
  TOKEN_INVALID: 'Invalid reset link. Please request a new one',
  PASSWORDS_DONT_MATCH: 'Passwords do not match',
  REQUIRED: 'Password is required',
} as const
