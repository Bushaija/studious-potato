// Financial Reports Types
import type { ReportStatus } from "./financial-reports-approval";
import type { SnapshotData } from "./version-control";
import type { PeriodLock } from "./period-locks";

/**
 * Main Financial Report interface with snapshot and period lock fields
 */
export interface FinancialReport {
  id: number;
  projectId: number;
  facilityId: number;
  reportingPeriodId: number;
  status: ReportStatus;
  
  // Report metadata
  metadata?: {
    statementCode?: string;
    includeComparatives?: boolean;
    [key: string]: any;
  };
  
  // Snapshot fields
  reportData?: SnapshotData | null;
  snapshotChecksum?: string | null;
  snapshotTimestamp?: string | null;
  sourceDataVersion?: string | null;
  isOutdated?: boolean;
  
  // Version tracking
  version?: string;
  
  // Locking
  locked?: boolean;
  
  // Submission tracking
  submittedBy?: number | null;
  submittedAt?: string | null;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // Relations (optional, populated when needed)
  project?: {
    id: number;
    name: string;
    code: string;
    projectType?: string;
  };
  facility?: {
    id: number;
    name: string;
    type?: string;
    district?: string;
  };
  reportingPeriod?: {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
  };
  submitter?: {
    id: number;
    name: string;
    email: string;
  };
  periodLock?: PeriodLock;
  versions?: Array<{
    versionNumber: string;
    snapshotTimestamp: string;
    createdBy: string;
    changesSummary: string | null;
  }>;
}

/**
 * Request/Response types for financial reports API
 */
export interface CreateFinancialReportRequest {
  projectId: number;
  facilityId: number;
  reportingPeriodId: number;
  metadata?: Record<string, any>;
}

export interface UpdateFinancialReportRequest {
  metadata?: Record<string, any>;
  status?: ReportStatus;
}

export interface GetFinancialReportsRequest {
  projectId?: number;
  facilityId?: number;
  reportingPeriodId?: number;
  status?: ReportStatus;
  page?: number;
  limit?: number;
}

export interface GetFinancialReportsResponse {
  reports: FinancialReport[];
  total: number;
  page: number;
  limit: number;
}

export interface GetFinancialReportResponse {
  report: FinancialReport;
}

/**
 * Snapshot indicator props
 */
export interface SnapshotIndicatorProps {
  isSnapshot: boolean;
  snapshotTimestamp?: string | null;
  isOutdated?: boolean;
}

/**
 * Period lock badge props
 */
export interface PeriodLockBadgeProps {
  isLocked: boolean;
  lockedAt?: string | null;
  lockedBy?: string | null;
}
