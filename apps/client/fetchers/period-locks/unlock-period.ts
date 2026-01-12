import { honoClient as client } from "@/api-client/index";
import type { UnlockPeriodRequest, UnlockPeriodResponse } from "@/types/period-locks";

/**
 * Fetcher to unlock a reporting period (admin only)
 * Requirements: 6.5, 7.1, 7.2, 7.3, 7.4, 9.1, 9.2, 9.3, 9.4, 9.5
 */
export async function unlockPeriod(
  lockId: number,
  data: UnlockPeriodRequest
): Promise<UnlockPeriodResponse> {
  const response = await (client as any)["period-locks"][":id"]["unlock"].$post({
    param: { id: lockId.toString() },
    json: data,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Failed to unlock period");
  }

  const result = await response.json();
  return result as UnlockPeriodResponse;
}
