import { useMemo } from 'react'
import { validatePassword } from '@/lib/validation/password-validation'
import type {
  PasswordPolicy,
  PasswordValidationResult,
} from '@/lib/validation/password-policy'
import { DEFAULT_PASSWORD_POLICY } from '@/lib/validation/password-policy'

/**
 * Hook for validating passwords against the password policy
 * 
 * This hook validates a password in real-time and returns:
 * - Whether the password is valid
 * - List of validation errors
 * - Password strength (weak/medium/strong)
 * - Status of each requirement (met/unmet)
 * 
 * @param password - The password to validate
 * @param policy - Optional custom password policy (defaults to DEFAULT_PASSWORD_POLICY)
 * @returns PasswordValidationResult with validation status, errors, strength, and requirements
 * 
 * @example
 * ```tsx
 * function PasswordForm() {
 *   const [password, setPassword] = useState('')
 *   const validation = usePasswordValidation(password)
 * 
 *   return (
 *     <div>
 *       <input 
 *         value={password} 
 *         onChange={(e) => setPassword(e.target.value)} 
 *       />
 *       {validation.errors.map(error => (
 *         <p key={error}>{error}</p>
 *       ))}
 *       <p>Strength: {validation.strength}</p>
 *     </div>
 *   )
 * }
 * ```
 */
export function usePasswordValidation(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY
): PasswordValidationResult {
  // Memoize the validation result to avoid unnecessary recalculations
  // Only recalculate when password or policy changes
  const validationResult = useMemo(() => {
    return validatePassword(password, policy)
  }, [password, policy])

  return validationResult
}
