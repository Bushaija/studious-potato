/**
 * TypeScript interfaces and types for Planning Creation Components
 * This file contains all component prop interfaces, state types, and shared context definitions
 */

// ============================================================================
// SHARED CONTEXT TYPES
// ============================================================================

export interface PlanningCreationContextValue {
  projectId: number;
  facilityId: number;
  reportingPeriodId: number;
  facilityName?: string;
  program: 'HIV' | 'TB' | 'Malaria';
  facilityType: 'hospital' | 'health_center';
  projectType?: 'HIV' | 'TB' | 'Malaria';
}

// ============================================================================
// TAB STATE MANAGEMENT TYPES
// ============================================================================

export type TabMode = 'manual' | 'upload';

export interface UploadProgressInfo {
  isUploading: boolean;
  progress: number;
  stage: string;
}

export interface TabState {
  activeTab: TabMode;
  hasUnsavedChanges: boolean;
  pendingTabSwitch: TabMode | null;
  showUnsavedChangesDialog: boolean;
  uploadProgress?: UploadProgressInfo;
}

// ============================================================================
// UPLOAD STATE TYPES
// ============================================================================

export type UploadStage = 'uploading' | 'parsing' | 'validating' | 'saving' | 'completed';

export interface UploadState {
  selectedFile: File | null;
  isUploading: boolean;
  uploadProgress: number;
  stage: UploadStage;
  validationResults: UploadResults | null;
  error: string | null;
}

// ============================================================================
// FILE VALIDATION TYPES
// ============================================================================

export interface FileValidation {
  isValid: boolean;
  errors: string[];
  fileInfo: {
    name: string;
    size: number;
    type: string;
  };
}

// ============================================================================
// VALIDATION AND RESULTS TYPES
// ============================================================================

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

export interface UploadResults {
  success: boolean;
  planningId?: number;
  stats: UploadStats;
}

// ============================================================================
// COMPONENT PROP INTERFACES
// ============================================================================

// Main container component props
export interface PlanningCreationTabsProps {
  projectId: number;
  facilityId: number;
  reportingPeriodId: number;
  facilityName?: string;
  program: 'HIV' | 'TB' | 'Malaria';
  facilityType: 'hospital' | 'health_center';
  projectType?: 'HIV' | 'TB' | 'Malaria';
  onSuccess?: (data: any) => void;
  onCancel?: () => void;
  defaultTab?: TabMode;
  className?: string;
}

// File upload tab props
export interface FileUploadTabProps {
  projectId: number;
  facilityId: number;
  reportingPeriodId: number;
  projectType: 'HIV' | 'TB' | 'Malaria';
  facilityType: 'hospital' | 'health_center';
  onUploadSuccess: (planningId: number) => void;
  className?: string;
}

// File upload area props
export interface FileUploadAreaProps {
  onFileSelect: (file: File) => void;
  acceptedFormats?: string[];
  maxFileSize?: number; // in bytes
  disabled?: boolean;
  selectedFile?: File | null;
  onClearFile?: () => void;
  className?: string;
  isProcessing?: boolean;
  showValidationFeedback?: boolean;
}

// Template download props
export interface TemplateDownloadProps {
  projectType: 'HIV' | 'TB' | 'Malaria';
  facilityType: 'hospital' | 'health_center';
  disabled?: boolean;
  className?: string;
}

// Upload progress props
export interface UploadProgressProps {
  isUploading: boolean;
  progress: number; // 0-100
  stage: UploadStage;
  fileName: string;
  className?: string;
  onCancel?: () => void;
  showDetailedProgress?: boolean;
  estimatedTimeRemaining?: number;
  connectionStatus?: 'online' | 'offline' | 'slow';
}

// Validation results props
export interface ValidationResultsProps {
  results: UploadResults;
  onRetry: () => void;
  onViewDetails: (planningId: number) => void;
  onBackToList: () => void;
  className?: string;
}

// Manual entry tab props
export interface ManualEntryTabProps {
  onUnsavedChanges: (hasChanges: boolean) => void;
  onSuccess: (data: any) => void;
  onCancel?: () => void;
  className?: string;
}

// ============================================================================
// CALLBACK FUNCTION TYPES
// ============================================================================

export type FileSelectHandler = (file: File) => void;
export type ClearFileHandler = () => void;
export type UploadSuccessHandler = (planningId: number) => void;
export type UnsavedChangesHandler = (hasChanges: boolean) => void;
export type TabChangeHandler = (tab: TabMode) => void;
export type RetryHandler = () => void;
export type ViewDetailsHandler = (planningId: number) => void;
export type BackToListHandler = () => void;

// ============================================================================
// STAGE INFORMATION TYPES
// ============================================================================

export interface StageInfo {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export type StageStatus = 'completed' | 'current' | 'pending';

// ============================================================================
// SUCCESS/ERROR HANDLING TYPES
// ============================================================================

export interface SuccessData {
  planningId?: number;
  mode: 'manual' | 'upload';
  [key: string]: any;
}

export interface ErrorInfo {
  message: string;
  code?: string;
  details?: any;
}

// ============================================================================
// CONSTANTS AND DEFAULTS
// ============================================================================

export const DEFAULT_ACCEPTED_FORMATS = ['.xlsx', '.xls', '.csv'] as const;
export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const STAGE_ORDER: UploadStage[] = ['uploading', 'parsing', 'validating', 'saving', 'completed'];

// ============================================================================
// TYPE GUARDS AND UTILITIES
// ============================================================================

export function isValidTabMode(value: string): value is TabMode {
  return value === 'manual' || value === 'upload';
}

export function isValidUploadStage(value: string): value is UploadStage {
  return STAGE_ORDER.includes(value as UploadStage);
}

export function hasValidationIssues(stats: UploadStats): boolean {
  return stats.hasIssues || stats.errorCount > 0 || stats.warningCount > 0;
}

export function isUploadSuccessful(results: UploadResults): boolean {
  return results.success && !!results.planningId;
}