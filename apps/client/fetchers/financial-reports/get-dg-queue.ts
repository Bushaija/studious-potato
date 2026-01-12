import { honoClient as client } from "@/api-client/index";

/**
 * Request parameters for DG queue
 */
export type GetDgQueueRequest = {
  page?: number;
  limit?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'all';
};

/**
 * Response type for DG queue
 */
export type GetDgQueueResponse = {
  reports: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/**
 * Fetch DG approval queue
 * Requirements: 6.1-6.4, 5.3, 3.4-3.8
 * 
 * Fetches reports approved by DAF and pending DG approval from facilities within the user's hierarchy.
 * Includes facility name, type, DAF approval details, and supports pagination.
 */
export async function getDgQueue(query?: GetDgQueueRequest) {
  const response = await (client as any)["financial-reports"]["dg-queue"].$get({
    query: query || {},
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as GetDgQueueResponse;
}
