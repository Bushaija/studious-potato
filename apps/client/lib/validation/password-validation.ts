import { COMMON_PASSWORDS } from './common-passwords'
import {
  DEFAULT_PASSWORD_POLICY,
  PASSWORD_ERROR_MESSAGES,
  type PasswordPolicy,
  type PasswordRequirement,
  type PasswordStrength,
  type PasswordValidationResult,
} from './password-policy'

/**
 * Validates a password against the password policy
 * @param password - The password to validate
 * @param policy - The password policy to validate against (defaults to DEFAULT_PASSWORD_POLICY)
 * @returns PasswordValidationResult with validation status, errors, strength, and requirements
 */
export function validatePassword(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY
): PasswordValidationResult {
  const errors: string[] = []
  const requirements: PasswordRequirement[] = []

  // Check minimum length
  const hasMinLength = password.length >= policy.minLength
  requirements.push({
    label: `At least ${policy.minLength} characters`,
    met: hasMinLength,
    key: 'minLength',
  })
  if (!hasMinLength && policy.minLength > 0) {
    errors.push(PASSWORD_ERROR_MESSAGES.TOO_SHORT)
  }

  // Check uppercase requirement
  const hasUppercase = /[A-Z]/.test(password)
  if (policy.requireUppercase) {
    requirements.push({
      label: 'One uppercase letter',
      met: hasUppercase,
      key: 'uppercase',
    })
    if (!hasUppercase) {
      errors.push(PASSWORD_ERROR_MESSAGES.NO_UPPERCASE)
    }
  }

  // Check lowercase requirement
  const hasLowercase = /[a-z]/.test(password)
  if (policy.requireLowercase) {
    requirements.push({
      label: 'One lowercase letter',
      met: hasLowercase,
      key: 'lowercase',
    })
    if (!hasLowercase) {
      errors.push(PASSWORD_ERROR_MESSAGES.NO_LOWERCASE)
    }
  }

  // Check number requirement
  const hasNumber = /[0-9]/.test(password)
  if (policy.requireNumber) {
    requirements.push({
      label: 'One number',
      met: hasNumber,
      key: 'number',
    })
    if (!hasNumber) {
      errors.push(PASSWORD_ERROR_MESSAGES.NO_NUMBER)
    }
  }

  // Check special character requirement
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  if (policy.requireSpecialChar) {
    requirements.push({
      label: 'One special character',
      met: hasSpecialChar,
      key: 'specialChar',
    })
    if (!hasSpecialChar) {
      errors.push(PASSWORD_ERROR_MESSAGES.NO_SPECIAL)
    }
  }

  // Check against common passwords list
  const isCommonPassword = COMMON_PASSWORDS.has(password.toLowerCase())
  if (policy.commonPasswordsCheck) {
    requirements.push({
      label: 'Not a common password',
      met: !isCommonPassword,
      key: 'notCommon',
    })
    if (isCommonPassword) {
      errors.push(PASSWORD_ERROR_MESSAGES.COMMON_PASSWORD)
    }
  }

  // Calculate password strength
  const strength = calculatePasswordStrength(password, {
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    isCommonPassword,
  })

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    requirements,
  }
}

/**
 * Calculates the strength of a password
 * @param password - The password to evaluate
 * @param checks - Object containing boolean results of various password checks
 * @returns PasswordStrength ('weak', 'medium', or 'strong')
 */
export function calculatePasswordStrength(
  password: string,
  checks: {
    hasMinLength: boolean
    hasUppercase: boolean
    hasLowercase: boolean
    hasNumber: boolean
    hasSpecialChar: boolean
    isCommonPassword: boolean
  }
): PasswordStrength {
  // If it's a common password, it's automatically weak
  if (checks.isCommonPassword) {
    return 'weak'
  }

  // Count how many requirements are met
  let score = 0

  if (checks.hasMinLength) score++
  if (checks.hasUppercase) score++
  if (checks.hasLowercase) score++
  if (checks.hasNumber) score++
  if (checks.hasSpecialChar) score++

  // Bonus points for length
  if (password.length >= 12) score++
  if (password.length >= 16) score++

  // Check for character variety (more unique characters = stronger)
  const uniqueChars = new Set(password).size
  if (uniqueChars >= password.length * 0.7) score++

  // Determine strength based on score
  if (score <= 3) return 'weak'
  if (score <= 6) return 'medium'
  return 'strong'
}

/**
 * Checks if a password meets the minimum requirements
 * @param password - The password to check
 * @param policy - The password policy to check against
 * @returns boolean indicating if password is valid
 */
export function isPasswordValid(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY
): boolean {
  return validatePassword(password, policy).isValid
}

/**
 * Gets a list of unmet requirements for a password
 * @param password - The password to check
 * @param policy - The password policy to check against
 * @returns Array of unmet requirement labels
 */
export function getUnmetRequirements(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY
): string[] {
  const result = validatePassword(password, policy)
  return result.requirements.filter((req) => !req.met).map((req) => req.label)
}
