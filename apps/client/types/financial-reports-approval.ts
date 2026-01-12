// Financial Reports Approval Types
export type ReportStatus = 
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'pending_daf_approval'
  | 'rejected_by_daf'
  | 'approved_by_daf'
  | 'rejected_by_dg'
  | 'fully_approved';

export type WorkflowAction =
  | 'submitted'
  | 'daf_approved'
  | 'daf_rejected'
  | 'dg_approved'
  | 'dg_rejected';

export interface WorkflowLog {
  id: number;
  reportId: number;
  action: WorkflowAction;
  actorId: number;
  comment: string | null;
  timestamp: string;
}

export interface WorkflowLogWithActor extends WorkflowLog {
  actor?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface ApprovalActionRequest {
  comment?: string;
}

export interface RejectionActionRequest {
  comment: string;
}

export interface ApprovalActionResponse {
  report: any; // Full report object
  message: string;
}

export interface WorkflowLogsResponse {
  logs: WorkflowLogWithActor[];
}
