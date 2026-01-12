/**
 * Client-side validation utilities for upload operations
 * Provides pre-upload validation to catch issues early
 */

import { validateFile, type UploadErrorInfo } from './upload-errors';

export interface UploadValidationContext {
  projectId: number;
  facilityId: number;
  reportingPeriodId: number;
  projectType: 'HIV' | 'TB' | 'Malaria';
  facilityType: 'hospital' | 'health_center';
  userPermissions?: string[];
  userFacilities?: number[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: UploadErrorInfo[];
  warnings: UploadErrorInfo[];
}

/**
 * Validates file and context before upload
 */
export function validateUploadRequest(
  file: File,
  context: UploadValidationContext
): ValidationResult {
  const errors: UploadErrorInfo[] = [];
  const warnings: UploadErrorInfo[] = [];

  // File validation
  const fileValidation = validateFile(file);
  if (!fileValidation.isValid) {
    errors.push(...fileValidation.errors);
  }

  // Context validation
  const contextValidation = validateUploadContext(context);
  errors.push(...contextValidation.errors);
  warnings.push(...contextValidation.warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates upload context (permissions, facility access, etc.)
 */
export function validateUploadContext(
  context: UploadValidationContext
): ValidationResult {
  const errors: UploadErrorInfo[] = [];
  const warnings: UploadErrorInfo[] = [];

  // Validate required context fields
  if (!context.projectId || context.projectId <= 0) {
    errors.push({
      title: "Invalid project",
      description: "No valid project selected. Please refresh the page and try again.",
      canRetry: false,
      severity: 'error',
      category: 'validation'
    });
  }

  if (!context.facilityId || context.facilityId <= 0) {
    errors.push({
      title: "Invalid facility",
      description: "No valid facility selected. Please refresh the page and try again.",
      canRetry: false,
      severity: 'error',
      category: 'validation'
    });
  }

  if (!context.reportingPeriodId || context.reportingPeriodId <= 0) {
    errors.push({
      title: "Invalid reporting period",
      description: "No valid reporting period selected. Please refresh the page and try again.",
      canRetry: false,
      severity: 'error',
      category: 'validation'
    });
  }

  // Validate project type
  if (!['HIV', 'TB', 'Malaria'].includes(context.projectType)) {
    errors.push({
      title: "Invalid project type",
      description: "The project type is not supported. Please contact support.",
      canRetry: false,
      severity: 'error',
      category: 'validation'
    });
  }

  // Validate facility type
  if (!['hospital', 'health_center'].includes(context.facilityType)) {
    errors.push({
      title: "Invalid facility type",
      description: "The facility type is not supported. Please contact support.",
      canRetry: false,
      severity: 'error',
      category: 'validation'
    });
  }

  // Check facility access if user facilities are provided
  if (context.userFacilities && context.userFacilities.length > 0) {
    if (!context.userFacilities.includes(context.facilityId)) {
      errors.push({
        title: "Facility access denied",
        description: "You don't have access to upload data for this facility. Please ensure you're uploading data for a facility within your district.",
        action: {
          label: "Contact Support"
        },
        canRetry: false,
        severity: 'error',
        category: 'access'
      });
    }
  }

  // Check permissions if provided
  if (context.userPermissions && context.userPermissions.length > 0) {
    const requiredPermissions = ['planning:create', 'planning:upload'];
    const hasRequiredPermissions = requiredPermissions.some(permission =>
      context.userPermissions!.includes(permission)
    );

    if (!hasRequiredPermissions) {
      errors.push({
        title: "Insufficient permissions",
        description: "You don't have the required permissions to upload planning data. Please contact your administrator.",
        action: {
          label: "Contact Support"
        },
        canRetry: false,
        severity: 'error',
        category: 'access'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates browser capabilities for file upload
 */
export function validateBrowserCapabilities(): ValidationResult {
  const errors: UploadErrorInfo[] = [];
  const warnings: UploadErrorInfo[] = [];

  // Check File API support
  if (typeof File === 'undefined' || typeof FileReader === 'undefined') {
    errors.push({
      title: "Browser not supported",
      description: "Your browser doesn't support file uploads. Please use a modern browser like Chrome, Firefox, or Safari.",
      canRetry: false,
      severity: 'error',
      category: 'validation'
    });
  }

  // Check Fetch API support
  if (typeof fetch === 'undefined') {
    errors.push({
      title: "Browser not supported",
      description: "Your browser doesn't support modern web features required for file upload. Please update your browser.",
      canRetry: false,
      severity: 'error',
      category: 'validation'
    });
  }

  // Check for drag and drop support
  if (typeof window !== 'undefined') {
    const div = document.createElement('div');
    const hasDragAndDrop = ('draggable' in div) || ('ondragstart' in div && 'ondrop' in div);
    
    if (!hasDragAndDrop) {
      warnings.push({
        title: "Limited drag and drop support",
        description: "Your browser has limited drag and drop support. You can still upload files using the browse button.",
        canRetry: true,
        severity: 'warning',
        category: 'validation'
      });
    }
  }

  // Check for local storage (for progress persistence)
  try {
    if (typeof localStorage === 'undefined') {
      warnings.push({
        title: "Limited storage support",
        description: "Your browser doesn't support local storage. Upload progress may not be preserved if you refresh the page.",
        canRetry: true,
        severity: 'warning',
        category: 'validation'
      });
    }
  } catch {
    // localStorage might throw in private browsing mode
    warnings.push({
      title: "Private browsing detected",
      description: "You appear to be in private browsing mode. Upload progress may not be preserved if you refresh the page.",
      canRetry: true,
      severity: 'info',
      category: 'validation'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates network connectivity before upload with enhanced error detection
 */
export function validateNetworkConnectivity(): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const errors: UploadErrorInfo[] = [];
    const warnings: UploadErrorInfo[] = [];

    // Check online status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      errors.push({
        title: "No internet connection",
        description: "You appear to be offline. Please check your internet connection and try again.",
        action: {
          label: "Retry Connection Check"
        },
        canRetry: true,
        severity: 'error',
        category: 'network'
      });
      
      resolve({
        isValid: false,
        errors,
        warnings
      });
      return;
    }

    // Enhanced connectivity test with multiple fallbacks
    const connectivityTests = [
      // Test 1: Favicon (fastest)
      () => testImageLoad('/favicon.ico?' + Date.now(), 3000),
      // Test 2: API health check
      () => testApiConnectivity('/api/health', 5000),
      // Test 3: External reliable endpoint
      () => testImageLoad('https://www.google.com/favicon.ico?' + Date.now(), 5000)
    ];

    Promise.allSettled(connectivityTests.map(test => test()))
      .then((results) => {
        const successfulTests = results.filter(result => 
          result.status === 'fulfilled' && result.value === true
        ).length;

        if (successfulTests === 0) {
          errors.push({
            title: "Connection issues detected",
            description: "Unable to verify internet connectivity. The upload may fail or be very slow. Please check your connection.",
            action: {
              label: "Test Connection Again"
            },
            canRetry: true,
            severity: 'error',
            category: 'network'
          });
        } else if (successfulTests === 1) {
          warnings.push({
            title: "Unstable connection detected",
            description: "Your internet connection appears unstable. The upload may be slower than usual or may need to be retried.",
            canRetry: true,
            severity: 'warning',
            category: 'network'
          });
        } else if (successfulTests === 2) {
          warnings.push({
            title: "Slow connection detected",
            description: "Your internet connection appears slow. The upload may take longer than usual.",
            canRetry: true,
            severity: 'info',
            category: 'network'
          });
        }
        // If all 3 tests pass, no warnings needed

        resolve({
          isValid: errors.length === 0,
          errors,
          warnings
        });
      });
  });
}

/**
 * Test image loading for connectivity check
 */
function testImageLoad(src: string, timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timeoutId = setTimeout(() => {
      resolve(false);
    }, timeout);

    img.onload = () => {
      clearTimeout(timeoutId);
      resolve(true);
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      resolve(false);
    };

    img.src = src;
  });
}

/**
 * Test API connectivity
 */
function testApiConnectivity(endpoint: string, timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      resolve(false);
    }, timeout);

    fetch(endpoint, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache'
    })
      .then(response => {
        clearTimeout(timeoutId);
        resolve(response.ok);
      })
      .catch(() => {
        clearTimeout(timeoutId);
        resolve(false);
      });
  });
}

/**
 * Comprehensive pre-upload validation
 */
export async function validateBeforeUpload(
  file: File,
  context: UploadValidationContext
): Promise<ValidationResult> {
  const results: ValidationResult[] = [];

  // File and context validation
  results.push(validateUploadRequest(file, context));

  // Browser capabilities validation
  results.push(validateBrowserCapabilities());

  // Network connectivity validation
  const networkValidation = await validateNetworkConnectivity();
  results.push(networkValidation);

  // Combine all results
  const allErrors = results.flatMap(r => r.errors);
  const allWarnings = results.flatMap(r => r.warnings);

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Utility to check if validation allows upload to proceed
 */
export function canProceedWithUpload(validation: ValidationResult): boolean {
  // Can proceed if no errors (warnings are okay)
  return validation.isValid;
}

/**
 * Utility to get user-friendly validation summary
 */
export function getValidationSummary(validation: ValidationResult): string {
  if (validation.isValid) {
    if (validation.warnings.length > 0) {
      return `Ready to upload (${validation.warnings.length} warning${validation.warnings.length > 1 ? 's' : ''})`;
    }
    return 'Ready to upload';
  }

  const errorCount = validation.errors.length;
  const warningCount = validation.warnings.length;
  
  let summary = `${errorCount} error${errorCount > 1 ? 's' : ''}`;
  if (warningCount > 0) {
    summary += `, ${warningCount} warning${warningCount > 1 ? 's' : ''}`;
  }
  
  return summary;
}