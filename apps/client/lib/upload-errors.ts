/**
 * Error handling utilities for file upload operations
 * Provides comprehensive error mapping, validation, and user-friendly messaging
 */

export interface UploadErrorInfo {
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  canRetry: boolean;
  severity: 'error' | 'warning' | 'info';
  category: 'validation' | 'network' | 'server' | 'access' | 'file' | 'processing';
}

export interface UploadErrorDetails {
  code?: string;
  status?: number;
  message?: string;
  stage?: 'upload' | 'parsing' | 'validation' | 'saving';
  context?: any;
}

/**
 * Maps file validation error codes to user-friendly messages
 */
export const FILE_VALIDATION_ERROR_MAP: Record<string, UploadErrorInfo> = {
  'FILE_TOO_LARGE': {
    title: "File too large",
    description: "The selected file exceeds the maximum size limit of 10MB. Please choose a smaller file or compress your data.",
    action: {
      label: "Choose Different File"
    },
    canRetry: true,
    severity: 'error',
    category: 'validation'
  },
  'INVALID_FILE_FORMAT': {
    title: "Invalid file format",
    description: "Only Excel (.xlsx, .xls) and CSV (.csv) files are supported. Please convert your file to a supported format.",
    action: {
      label: "Download Template"
    },
    canRetry: true,
    severity: 'error',
    category: 'validation'
  },
  'FILE_CORRUPTED': {
    title: "File corrupted",
    description: "The selected file appears to be corrupted or damaged. Please try a different file or re-export your data.",
    canRetry: true,
    severity: 'error',
    category: 'file'
  },
  'FILE_EMPTY': {
    title: "Empty file",
    description: "The selected file is empty or contains no data. Please ensure your file has planning data before uploading.",
    canRetry: true,
    severity: 'error',
    category: 'validation'
  },
  'UNSUPPORTED_BROWSER': {
    title: "Browser not supported",
    description: "Your browser doesn't support file uploads. Please use a modern browser like Chrome, Firefox, or Safari.",
    canRetry: false,
    severity: 'error',
    category: 'validation'
  }
};

/**
 * Maps upload processing error codes to user-friendly messages
 */
export const UPLOAD_PROCESSING_ERROR_MAP: Record<string, UploadErrorInfo> = {
  'PARSING_FAILED': {
    title: "File parsing failed",
    description: "Unable to read the file content. Please ensure the file is not password-protected and follows the template format.",
    action: {
      label: "Download Template"
    },
    canRetry: true,
    severity: 'error',
    category: 'processing'
  },
  'VALIDATION_FAILED': {
    title: "Data validation failed",
    description: "Some data in your file doesn't meet the required format or contains errors. Please review the details below.",
    canRetry: true,
    severity: 'warning',
    category: 'validation'
  },
  'DUPLICATE_PLANNING': {
    title: "Planning already exists",
    description: "A planning record already exists for this facility and reporting period. You can update the existing record instead.",
    action: {
      label: "View Existing Planning"
    },
    canRetry: false,
    severity: 'error',
    category: 'validation'
  },
  'MISSING_REQUIRED_COLUMNS': {
    title: "Missing required columns",
    description: "Your file is missing required columns. Please download the latest template and ensure all columns are included.",
    action: {
      label: "Download Template"
    },
    canRetry: true,
    severity: 'error',
    category: 'validation'
  },
  'INVALID_DATA_FORMAT': {
    title: "Invalid data format",
    description: "Some data in your file is in an incorrect format. Please check numeric values, dates, and text fields.",
    canRetry: true,
    severity: 'error',
    category: 'validation'
  }
};

/**
 * Maps network and server error codes to user-friendly messages
 */
export const NETWORK_ERROR_MAP: Record<string, UploadErrorInfo> = {
  'NETWORK_ERROR': {
    title: "Connection problem",
    description: "Unable to connect to the server. Please check your internet connection and try again.",
    action: {
      label: "Retry Upload"
    },
    canRetry: true,
    severity: 'error',
    category: 'network'
  },
  'TIMEOUT_ERROR': {
    title: "Upload timeout",
    description: "The upload took too long and timed out. This may be due to a large file or slow connection. Please try again.",
    action: {
      label: "Retry Upload"
    },
    canRetry: true,
    severity: 'error',
    category: 'network'
  },
  'SERVER_ERROR': {
    title: "Server error",
    description: "We're experiencing technical difficulties. Please try again in a few minutes or contact support if the problem persists.",
    action: {
      label: "Retry Upload"
    },
    canRetry: true,
    severity: 'error',
    category: 'server'
  },
  'SERVICE_UNAVAILABLE': {
    title: "Service temporarily unavailable",
    description: "The upload service is temporarily unavailable. Please try again in a few minutes.",
    action: {
      label: "Retry Upload"
    },
    canRetry: true,
    severity: 'error',
    category: 'server'
  }
};

/**
 * Maps access control error codes to user-friendly messages
 */
export const ACCESS_ERROR_MAP: Record<string, UploadErrorInfo> = {
  'ACCESS_DENIED': {
    title: "Access denied",
    description: "You don't have permission to upload planning data for this facility. Please contact your administrator.",
    action: {
      label: "Contact Support"
    },
    canRetry: false,
    severity: 'error',
    category: 'access'
  },
  'FACILITY_ACCESS_DENIED': {
    title: "Facility access denied",
    description: "You don't have access to this facility. Please ensure you're uploading data for a facility within your district.",
    canRetry: false,
    severity: 'error',
    category: 'access'
  },
  'UNAUTHORIZED': {
    title: "Authentication required",
    description: "Your session has expired. Please sign in again to continue uploading.",
    action: {
      label: "Sign In",
      href: "/sign-in"
    },
    canRetry: false,
    severity: 'error',
    category: 'access'
  },
  'INSUFFICIENT_PERMISSIONS': {
    title: "Insufficient permissions",
    description: "You don't have the required permissions to upload planning data. Please contact your administrator.",
    action: {
      label: "Contact Support"
    },
    canRetry: false,
    severity: 'error',
    category: 'access'
  }
};

/**
 * Maps HTTP status codes to user-friendly messages for upload context
 */
export const HTTP_UPLOAD_ERROR_MAP: Record<number, UploadErrorInfo> = {
  400: {
    title: "Invalid upload request",
    description: "The upload request is invalid. Please check your file and try again, or download a fresh template.",
    action: {
      label: "Download Template"
    },
    canRetry: true,
    severity: 'error',
    category: 'validation'
  },
  401: {
    title: "Authentication required",
    description: "Your session has expired. Please sign in again to continue uploading.",
    action: {
      label: "Sign In",
      href: "/sign-in"
    },
    canRetry: false,
    severity: 'error',
    category: 'access'
  },
  403: {
    title: "Upload not allowed",
    description: "You don't have permission to upload planning data for this facility. Please contact your administrator.",
    action: {
      label: "Contact Support"
    },
    canRetry: false,
    severity: 'error',
    category: 'access'
  },
  413: {
    title: "File too large",
    description: "The file size exceeds the server limit. Please reduce the file size or split your data into smaller files.",
    canRetry: true,
    severity: 'error',
    category: 'validation'
  },
  415: {
    title: "Unsupported file type",
    description: "The file type is not supported. Please use Excel (.xlsx, .xls) or CSV (.csv) format.",
    action: {
      label: "Download Template"
    },
    canRetry: true,
    severity: 'error',
    category: 'validation'
  },
  422: {
    title: "Data validation failed",
    description: "The uploaded data contains validation errors. Please review the error details and correct your file.",
    canRetry: true,
    severity: 'warning',
    category: 'validation'
  },
  429: {
    title: "Too many upload attempts",
    description: "You've made too many upload attempts. Please wait a few minutes before trying again.",
    canRetry: true,
    severity: 'warning',
    category: 'network'
  },
  500: {
    title: "Server processing error",
    description: "The server encountered an error while processing your file. Please try again or contact support.",
    action: {
      label: "Retry Upload"
    },
    canRetry: true,
    severity: 'error',
    category: 'server'
  },
  502: {
    title: "Service unavailable",
    description: "The upload service is temporarily unavailable. Please try again in a few minutes.",
    action: {
      label: "Retry Upload"
    },
    canRetry: true,
    severity: 'error',
    category: 'server'
  },
  503: {
    title: "Service overloaded",
    description: "The upload service is currently overloaded. Please try again in a few minutes.",
    action: {
      label: "Retry Upload"
    },
    canRetry: true,
    severity: 'error',
    category: 'server'
  },
  504: {
    title: "Upload timeout",
    description: "The upload took too long to process. This may be due to a large file. Please try again or use a smaller file.",
    action: {
      label: "Retry Upload"
    },
    canRetry: true,
    severity: 'error',
    category: 'network'
  }
};

/**
 * Default error for unknown cases
 */
export const DEFAULT_UPLOAD_ERROR: UploadErrorInfo = {
  title: "Upload failed",
  description: "An unexpected error occurred during upload. Please try again or contact support if the problem persists.",
  action: {
    label: "Retry Upload"
  },
  canRetry: true,
  severity: 'error',
  category: 'server'
};

/**
 * File validation constraints
 */
export const FILE_CONSTRAINTS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ACCEPTED_FORMATS: ['.xlsx', '.xls', '.csv'],
  ACCEPTED_MIME_TYPES: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/csv'
  ]
} as const;

/**
 * Validates file format and size
 */
export function validateFile(file: File): { isValid: boolean; errors: UploadErrorInfo[] } {
  const errors: UploadErrorInfo[] = [];

  // Check if File API is supported
  if (typeof File === 'undefined' || typeof FileReader === 'undefined') {
    errors.push(FILE_VALIDATION_ERROR_MAP.UNSUPPORTED_BROWSER);
    return { isValid: false, errors };
  }

  // Check file size
  if (file.size > FILE_CONSTRAINTS.MAX_SIZE) {
    errors.push({
      ...FILE_VALIDATION_ERROR_MAP.FILE_TOO_LARGE,
      description: `File size (${formatFileSize(file.size)}) exceeds the maximum limit of ${formatFileSize(FILE_CONSTRAINTS.MAX_SIZE)}. Please choose a smaller file.`
    });
  }

  // Check if file is empty
  if (file.size === 0) {
    errors.push(FILE_VALIDATION_ERROR_MAP.FILE_EMPTY);
  }

  // Check file format by extension
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  const isValidExtension = FILE_CONSTRAINTS.ACCEPTED_FORMATS.some(
    format => format.toLowerCase() === fileExtension
  );

  // Check MIME type as additional validation
  const isValidMimeType = FILE_CONSTRAINTS.ACCEPTED_MIME_TYPES.includes(file.type as any);

  if (!isValidExtension && !isValidMimeType) {
    errors.push({
      ...FILE_VALIDATION_ERROR_MAP.INVALID_FILE_FORMAT,
      description: `File format "${fileExtension}" is not supported. Please use one of: ${FILE_CONSTRAINTS.ACCEPTED_FORMATS.join(', ')}`
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Extracts error details from various error sources
 */
export function extractUploadErrorDetails(error: any): UploadErrorDetails {
  // Handle different error object structures
  if (error?.response) {
    // Axios-style error
    return {
      status: error.response.status,
      code: error.response.data?.code || error.response.data?.error?.code,
      message: error.response.data?.message || error.response.data?.error?.message || error.message,
      stage: error.response.data?.stage,
      context: error.response.data
    };
  }

  if (error?.status) {
    // Fetch API error
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      stage: error.stage,
      context: error
    };
  }

  // Generic error object
  return {
    code: error?.code,
    message: error?.message || String(error),
    stage: error?.stage,
    context: error
  };
}

/**
 * Maps upload errors to user-friendly information
 */
export function mapUploadError(errorDetails: UploadErrorDetails): UploadErrorInfo {
  const { code, status, message, stage } = errorDetails;

  // First, try to match by specific error code
  if (code) {
    // Check file validation errors
    if (FILE_VALIDATION_ERROR_MAP[code]) {
      return FILE_VALIDATION_ERROR_MAP[code];
    }
    
    // Check processing errors
    if (UPLOAD_PROCESSING_ERROR_MAP[code]) {
      return UPLOAD_PROCESSING_ERROR_MAP[code];
    }
    
    // Check network errors
    if (NETWORK_ERROR_MAP[code]) {
      return NETWORK_ERROR_MAP[code];
    }
    
    // Check access errors
    if (ACCESS_ERROR_MAP[code]) {
      return ACCESS_ERROR_MAP[code];
    }
  }

  // Then try to match by HTTP status code
  if (status && HTTP_UPLOAD_ERROR_MAP[status]) {
    return HTTP_UPLOAD_ERROR_MAP[status];
  }

  // Handle network-related errors by message content
  if (message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch failed')) {
      return NETWORK_ERROR_MAP.NETWORK_ERROR;
    }
    
    if (lowerMessage.includes('timeout')) {
      return NETWORK_ERROR_MAP.TIMEOUT_ERROR;
    }
    
    if (lowerMessage.includes('cors')) {
      return {
        title: "Configuration error",
        description: "There's a configuration issue preventing the upload. Please contact support.",
        action: {
          label: "Contact Support"
        },
        canRetry: false,
        severity: 'error',
        category: 'server'
      };
    }

    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('authentication')) {
      return ACCESS_ERROR_MAP.UNAUTHORIZED;
    }

    if (lowerMessage.includes('forbidden') || lowerMessage.includes('access denied')) {
      return ACCESS_ERROR_MAP.ACCESS_DENIED;
    }
  }

  // Add stage-specific context to default error
  let stageContext = '';
  if (stage) {
    switch (stage) {
      case 'upload':
        stageContext = ' during file upload';
        break;
      case 'parsing':
        stageContext = ' while reading the file';
        break;
      case 'validation':
        stageContext = ' during data validation';
        break;
      case 'saving':
        stageContext = ' while saving the data';
        break;
    }
  }

  return {
    ...DEFAULT_UPLOAD_ERROR,
    description: `An unexpected error occurred${stageContext}. Please try again or contact support if the problem persists.`
  };
}

/**
 * Main function to handle upload errors
 */
export function handleUploadError(error: any): UploadErrorInfo {
  const errorDetails = extractUploadErrorDetails(error);
  
  // Log detailed error for debugging in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Upload error details:', {
      ...errorDetails,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server'
    });
  }

  return mapUploadError(errorDetails);
}

/**
 * Utility to check if an error is retryable
 */
export function isRetryableUploadError(error: UploadErrorInfo): boolean {
  return error.canRetry && !['access'].includes(error.category);
}

/**
 * Utility to format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Utility to format error for logging
 */
export function formatUploadErrorForLogging(errorDetails: UploadErrorDetails): string {
  const { code, status, message, stage } = errorDetails;
  const parts = [];
  
  if (stage) parts.push(`Stage: ${stage}`);
  if (code) parts.push(`Code: ${code}`);
  if (status) parts.push(`Status: ${status}`);
  if (message) parts.push(`Message: ${message}`);
  
  return parts.join(' | ') || 'Unknown upload error';
}

/**
 * Utility to get retry delay based on error type with enhanced backoff strategies
 */
export function getRetryDelay(error: UploadErrorInfo, attemptCount: number): number {
  // Base delay in milliseconds
  const baseDelay = 1000;
  
  // Exponential backoff for network errors with jitter
  if (error.category === 'network') {
    const exponentialDelay = baseDelay * Math.pow(2, attemptCount);
    const jitter = Math.random() * 1000; // Add randomness to prevent thundering herd
    return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
  }
  
  // Progressive delay for server errors
  if (error.category === 'server') {
    return Math.min(5000 + (attemptCount * 2000), 15000); // 5s, 7s, 9s, up to 15s max
  }
  
  // Short delay for processing errors (might be temporary)
  if (error.category === 'processing') {
    return Math.min(2000 + (attemptCount * 1000), 8000); // 2s, 3s, 4s, up to 8s max
  }
  
  // No automatic retry for validation and access errors
  return 0;
}

/**
 * Enhanced retry logic with smart retry decisions
 */
export function shouldRetryUpload(error: UploadErrorInfo, attemptCount: number, maxRetries: number = 3): boolean {
  // Don't retry if max attempts reached
  if (attemptCount >= maxRetries) {
    return false;
  }

  // Don't retry access or validation errors
  if (['access', 'validation'].includes(error.category)) {
    return false;
  }

  // Always retry network errors (up to max)
  if (error.category === 'network') {
    return true;
  }

  // Retry server errors but with fewer attempts
  if (error.category === 'server') {
    return attemptCount < Math.min(maxRetries, 2);
  }

  // Retry processing errors once
  if (error.category === 'processing') {
    return attemptCount < 1;
  }

  // Default to not retry
  return false;
}

/**
 * Get user-friendly retry message
 */
export function getRetryMessage(error: UploadErrorInfo, attemptCount: number): string {
  const nextAttempt = attemptCount + 1;
  
  switch (error.category) {
    case 'network':
      return `Retrying upload (attempt ${nextAttempt}) due to connection issues...`;
    case 'server':
      return `Retrying upload (attempt ${nextAttempt}) due to server error...`;
    case 'processing':
      return `Retrying upload (attempt ${nextAttempt}) due to processing error...`;
    default:
      return `Retrying upload (attempt ${nextAttempt})...`;
  }
}