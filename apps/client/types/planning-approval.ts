export type ApprovalStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type ApprovalAction = 'APPROVE' | 'REJECT';

export interface ApprovalStatusInfo {
  status: ApprovalStatus;
  reviewedBy: number | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewComments: string | null;
}

export interface ApprovalActionRequest {
  planningId: number;
  action: ApprovalAction;
  comments?: string;
}

export interface SubmitForApprovalRequest {
  planningIds: number[];
}

export interface ApprovalActionResponse {
  success: boolean;
  message: string;
  record: {
    id: number;
    approvalStatus: ApprovalStatus;
    reviewedBy: number | null;
    reviewedByName: string | null;
    reviewedAt: string | null;
    reviewComments: string | null;
  };
}

export interface SubmitForApprovalResponse {
  success: boolean;
  message: string;
  updatedCount: number;
}
