import { useQuery } from "@tanstack/react-query";
import { getPeriodLockAudit } from "@/fetchers/period-locks";

/**
 * Hook to fetch audit log for a period lock
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
export function usePeriodLockAudit(lockId: number | undefined) {
  return useQuery({
    queryKey: ["period-lock-audit", lockId],
    queryFn: () => {
      if (!lockId) {
        throw new Error("Lock ID is required");
      }
      return getPeriodLockAudit(lockId);
    },
    enabled: !!lockId,
  });
}
