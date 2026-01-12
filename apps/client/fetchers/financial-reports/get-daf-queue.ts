import { honoClient as client } from "@/api-client/index";

/**
 * Request parameters for DAF queue
 */
export type GetDafQueueRequest = {
  page?: number;
  limit?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'all';
};

/**
 * Response type for DAF queue
 */
export type GetDafQueueResponse = {
  reports: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/**
 * Fetch DAF approval queue
 * Requirements: 6.1-6.4, 3.1, 3.2
 * 
 * Fetches reports pending DAF approval from facilities within the user's hierarchy.
 * Includes facility name, type, submitter details, and supports pagination.
 */
export async function getDafQueue(query?: GetDafQueueRequest) {
  const response = await (client as any)["financial-reports"]["daf-queue"].$get({
    query: query || {},
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as GetDafQueueResponse;
}
