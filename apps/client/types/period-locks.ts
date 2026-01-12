// Period Lock Types for Financial Reports

export interface PeriodLock {
  id: number;
  reportingPeriodId: number;
  projectId: number;
  facilityId: number;
  isLocked: boolean;
  lockedBy: number | null;
  lockedAt: string | null;
  lockedReason: string | null;
  unlockedBy: number | null;
  unlockedAt: string | null;
  unlockedReason: string | null;
  // Relations
  reportingPeriod?: {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
  };
  project?: {
    id: number;
    name: string;
    code: string;
  };
  facility?: {
    id: number;
    name: string;
  };
  lockedByUser?: {
    id: number;
    name: string;
    email: string;
  };
  unlockedByUser?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface PeriodLockAuditEntry {
  id: number;
  periodLockId: number;
  action: "LOCKED" | "UNLOCKED" | "EDIT_ATTEMPTED";
  performedBy: number;
  performedAt: string;
  reason: string | null;
  metadata: any;
  // Relations
  performer?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface GetPeriodLocksResponse {
  locks: PeriodLock[];
}

export interface UnlockPeriodRequest {
  reason: string;
}

export interface UnlockPeriodResponse {
  success: boolean;
  message: string;
  periodLock: PeriodLock;
}

export interface GetPeriodLockAuditResponse {
  auditLogs: PeriodLockAuditEntry[];
}
