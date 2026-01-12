/**
 * TypeScript interfaces and types for Planning API Integration
 * This file contains all API request/response types, error handling types, and hook interfaces
 */

// ============================================================================
// UPLOAD API TYPES
// ============================================================================

export interface UploadPlanningRequest {
  projectId: number;
  facilityId: number;
  reportingPeriodId: number;
  projectType: 'HIV' | 'Malaria' | 'TB';
  facilityType: 'hospital' | 'health_center';
  fileName: string;
  fileData: string; // Base64 encoded file content
}

export interface ValidationIssue {
  id: number;
  row: number | null;
  type: 'warning' | 'error';
  message: string;
  category: string;
}

export interface DataQuality {
  score: number;
  completeness: number;
  accuracy: number;
  consistency: number;
}

export interface UploadStats {
  rowsParsed: number;
  validRows: number;
  invalidRows: number;
  activitiesProcessed: number;
  totalBudget: number;
  warnings: ValidationIssue[];
  errors: ValidationIssue[];
  warningCount: number;
  errorCount: number;
  hasIssues: boolean;
  dataQuality: DataQuality;
}

export interface ProcessingInfo {
  startedAt: string;
  completedAt?: string;
  duration?: number;
  stages: {
    upload: { completed: boolean; duration?: number };
    parsing: { completed: boolean; duration?: number };
    validation: { completed: boolean; duration?: number };
    saving: { completed: boolean; duration?: number };
  };
}

export interface PlanningRecord {
  id: number;
  projectId: number;
  facilityId: number;
  reportingPeriodId: number;
  schemaId: number;
  formData: Record<string, any>;
  metadata: Record<string, any>;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT';
  createdAt: string;
  updatedAt: string;
  sourceFileName?: string;
  sourceFileUrl?: string;
}

export interface UploadPlanningResponse {
  success: boolean;
  message: string;
  planningId?: number;
  stats: UploadStats;
  record: PlanningRecord | null;
  processing: ProcessingInfo;
}

// ============================================================================
// TEMPLATE DOWNLOAD API TYPES
// ============================================================================

export interface DownloadTemplateRequest {
  projectType: 'HIV' | 'TB' | 'Malaria';
  facilityType: 'hospital' | 'health_center';
  format: 'xlsx' | 'csv';
}

export interface TemplateMetadata {
  projectType: string;
  facilityType: string;
  format: string;
  generatedAt: string;
  version: string;
  activities: string[];
  columns: string[];
}

export interface DownloadTemplateResponse {
  blob: Blob;
  metadata: TemplateMetadata;
  filename: string;
}

// ============================================================================
// HOOK PARAMETER TYPES
// ============================================================================

export interface UseUploadPlanningParams {
  projectId: number;
  facilityId: number;
  reportingPeriodId: number;
  projectType: 'HIV' | 'Malaria' | 'TB';
  facilityType: 'hospital' | 'health_center';
}

export interface UploadPlanningMutationData {
  file: File;
  params: UseUploadPlanningParams;
}

export interface DownloadTemplateMutationData extends DownloadTemplateRequest {
  filename?: string;
}

// ============================================================================
// ERROR HANDLING TYPES
// ============================================================================

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
  timestamp?: string;
}

export interface ValidationError extends ApiError {
  issues: ValidationIssue[];
  failedRows: number[];
  context: {
    fileName: string;
    totalRows: number;
    validRows: number;
  };
}

export interface UploadError extends ApiError {
  stage: 'upload' | 'parsing' | 'validation' | 'saving';
  retryable: boolean;
  suggestions?: string[];
}

export interface NetworkError extends ApiError {
  isNetworkError: true;
  retryAfter?: number;
  maxRetries?: number;
}

export interface AccessError extends ApiError {
  isAccessError: true;
  requiredPermissions?: string[];
  userPermissions?: string[];
}

// ============================================================================
// MUTATION RESULT TYPES
// ============================================================================

export interface UploadMutationResult {
  data?: UploadPlanningResponse;
  error?: UploadError | ValidationError | NetworkError | AccessError;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isPending: boolean;
  reset: () => void;
  mutate: (data: UploadPlanningMutationData) => void;
  mutateAsync: (data: UploadPlanningMutationData) => Promise<UploadPlanningResponse>;
}

export interface DownloadMutationResult {
  data?: void;
  error?: ApiError | NetworkError;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isPending: boolean;
  reset: () => void;
  mutate: (data: DownloadTemplateMutationData) => void;
  mutateAsync: (data: DownloadTemplateMutationData) => Promise<void>;
}

// ============================================================================
// FILE PROCESSING TYPES
// ============================================================================

export interface FileProcessingOptions {
  validateFormat: boolean;
  validateSize: boolean;
  maxFileSize: number;
  acceptedFormats: string[];
  encoding: 'base64' | 'binary';
}

export interface FileProcessingResult {
  success: boolean;
  file?: File;
  base64Data?: string;
  error?: string;
  metadata: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  };
}

// ============================================================================
// PROGRESS TRACKING TYPES
// ============================================================================

export interface ProgressEvent {
  stage: 'uploading' | 'parsing' | 'validating' | 'saving';
  progress: number; // 0-100
  message?: string;
  timestamp: number;
}

export interface ProgressTracker {
  events: ProgressEvent[];
  currentStage: string;
  overallProgress: number;
  isComplete: boolean;
  hasError: boolean;
  error?: ApiError;
}

// ============================================================================
// RESPONSE WRAPPER TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  timestamp: string;
  requestId?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type ProjectType = 'HIV' | 'TB' | 'Malaria';
export type FacilityType = 'hospital' | 'health_center';
export type FileFormat = 'xlsx' | 'csv';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT';

// Union types for better type safety
export type SupportedProjectType = UploadPlanningRequest['projectType'];
export type SupportedFacilityType = UploadPlanningRequest['facilityType'];
export type SupportedFileFormat = DownloadTemplateRequest['format'];

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isApiError(error: any): error is ApiError {
  return error && typeof error === 'object' && 'message' in error;
}

export function isValidationError(error: any): error is ValidationError {
  return isApiError(error) && 'issues' in error && Array.isArray(error.issues);
}

export function isUploadError(error: any): error is UploadError {
  return isApiError(error) && 'stage' in error && 'retryable' in error;
}

export function isNetworkError(error: any): error is NetworkError {
  return isApiError(error) && 'isNetworkError' in error && error.isNetworkError === true;
}

export function isAccessError(error: any): error is AccessError {
  return isApiError(error) && 'isAccessError' in error && error.isAccessError === true;
}

export function isProjectType(value: string): value is ProjectType {
  return ['HIV', 'TB', 'Malaria'].includes(value);
}

export function isFacilityType(value: string): value is FacilityType {
  return ['hospital', 'health_center'].includes(value);
}

export function isFileFormat(value: string): value is FileFormat {
  return ['xlsx', 'csv'].includes(value);
}

export function isApprovalStatus(value: string): value is ApprovalStatus {
  return ['PENDING', 'APPROVED', 'REJECTED', 'DRAFT'].includes(value);
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const API_ENDPOINTS = {
  UPLOAD_PLANNING: '/planning/upload',
  DOWNLOAD_TEMPLATE: '/planning/template',
  VALIDATE_PLANNING: '/planning/validate',
  PLANNING_LIST: '/planning',
  PLANNING_DETAILS: '/planning/:id',
} as const;

export const FILE_CONSTRAINTS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ACCEPTED_FORMATS: ['.xlsx', '.xls', '.csv'],
  MIME_TYPES: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ],
} as const;

export const UPLOAD_STAGES = {
  UPLOADING: 'uploading',
  PARSING: 'parsing',
  VALIDATING: 'validating',
  SAVING: 'saving',
  COMPLETED: 'completed',
} as const;

export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FORMAT: 'INVALID_FORMAT',
  ACCESS_DENIED: 'ACCESS_DENIED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  DUPLICATE_PLANNING: 'DUPLICATE_PLANNING',
} as const;