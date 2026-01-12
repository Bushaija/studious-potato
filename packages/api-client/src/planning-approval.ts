import { honoClient, handleHonoResponse } from './index';

// ============================================================================
// Type Definitions
// ============================================================================

export type ApprovalStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type ApprovalAction = 'APPROVE' | 'REJECT';

// Request Types
export interface SubmitForApprovalRequest {
  planningIds: number[];
  comments?: string;
}

export interface ApprovalActionRequest {
  planningId: number;
  action: ApprovalAction;
  comments?: string;
}

export interface ReviewPlanningRequest {
  planningId: number;
  action: ApprovalAction;
  comments?: string;
}

// Response Types
export interface SubmitForApprovalResponse {
  success: boolean;
  message: string;
  updatedCount: number;
}

export interface ApprovalActionResponse {
  success: boolean;
  message: string;
  record: {
    id: number;
    approvalStatus: string;
    reviewedBy: number | null;
    reviewedByName: string | null;
    reviewedAt: string | null;
    reviewComments: string | null;
  };
}

export interface ReviewPlanningResponse {
  success: boolean;
  message: string;
  data: any; // Using any for now as the full schema is complex
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Submit one or more planning records for approval
 * Changes status from DRAFT to PENDING
 * 
 * @param planningIds - Array of planning IDs to submit
 * @param comments - Optional comments for the submission
 * @returns Promise with submission result
 */
export async function submitForApproval(
  planningIds: number[],
  comments?: string
): Promise<SubmitForApprovalResponse> {
  const response = await honoClient.planning['submit-for-approval'].$post({
    json: { planningIds, comments }
  });
  
  return handleHonoResponse<SubmitForApprovalResponse>(response as any);
}

/**
 * Approve or reject a planning record using the dedicated approve endpoint
 * 
 * @param planningId - ID of the planning record to approve/reject
 * @param action - Either 'APPROVE' or 'REJECT'
 * @param comments - Optional comments (required for rejection)
 * @returns Promise with approval result
 */
export async function approvePlanning(
  planningId: number,
  action: ApprovalAction,
  comments?: string
): Promise<ApprovalActionResponse> {
  const response = await honoClient.planning.approve.$post({
    json: { planningId, action, comments }
  });
  
  return handleHonoResponse<ApprovalActionResponse>(response as any);
}

/**
 * Review (approve or reject) a planning record using the review endpoint
 * Alternative endpoint to approvePlanning
 * 
 * @param planningId - ID of the planning record to review
 * @param action - Either 'APPROVE' or 'REJECT'
 * @param comments - Optional comments for the review
 * @returns Promise with review result
 */
export async function reviewPlanning(
  planningId: number,
  action: ApprovalAction,
  comments?: string
): Promise<ReviewPlanningResponse> {
  const response = await honoClient.planning.review.$post({
    json: { planningId, action, comments }
  });
  
  return handleHonoResponse<ReviewPlanningResponse>(response as any);
}
