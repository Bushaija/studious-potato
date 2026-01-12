import { honoClient as client } from "@/api-client/index";
import type { GetPeriodLockAuditResponse } from "@/types/period-locks";

/**
 * Fetcher to get audit log for a period lock
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
export async function getPeriodLockAudit(
  lockId: number
): Promise<GetPeriodLockAuditResponse> {
  const response = await (client as any)["period-locks"]["audit"][":id"].$get({
    param: { id: lockId.toString() },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Failed to fetch audit log");
  }

  const data = await response.json();
  return data as GetPeriodLockAuditResponse;
}
