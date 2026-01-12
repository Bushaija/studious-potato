import { honoClient as client } from "@/api-client/index";
import type { GetPeriodLocksResponse } from "@/types/period-locks";

/**
 * Fetcher to get all period locks for a facility
 * Requirements: 7.1, 7.2, 7.3, 7.4, 9.1, 9.2
 */
export async function getPeriodLocks(
  facilityId: number
): Promise<GetPeriodLocksResponse> {
  const response = await (client as any)["period-locks"].$get({
    query: {
      facilityId: facilityId.toString(),
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Failed to fetch period locks");
  }

  const data = await response.json();
  return data as GetPeriodLocksResponse;
}
