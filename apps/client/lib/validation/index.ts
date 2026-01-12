// Password validation exports
export { COMMON_PASSWORDS } from './common-passwords'
export {
  DEFAULT_PASSWORD_POLICY,
  PASSWORD_ERROR_MESSAGES,
  type PasswordPolicy,
  type PasswordRequirement,
  type PasswordStrength,
  type PasswordValidationResult,
} from './password-policy'
export {
  calculatePasswordStrength,
  getUnmetRequirements,
  isPasswordValid,
  validatePassword,
} from './password-validation'

// Password error handling exports
export {
  DEFAULT_PASSWORD_ERROR,
  HTTP_PASSWORD_ERROR_MAP,
  PASSWORD_ACCESS_ERROR_MAP,
  PASSWORD_NETWORK_ERROR_MAP,
  PASSWORD_OPERATION_ERROR_MAP,
  PASSWORD_VALIDATION_ERROR_MAP,
  extractPasswordErrorDetails,
  formatPasswordErrorForLogging,
  getOperationErrorContext,
  handlePasswordError,
  isRetryablePasswordError,
  mapPasswordError,
  type PasswordErrorDetails,
  type PasswordErrorInfo,
} from './password-errors'
