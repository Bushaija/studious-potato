import { useQuery } from "@tanstack/react-query";
import getTasks, { type GetTasksRequest } from "@/fetchers/dashboard/get-tasks";

export function useGetTasks(params: GetTasksRequest = {}) {
  return useQuery({
    queryKey: ["dashboard", "tasks", params.facilityId],
    queryFn: () => getTasks(params),
    staleTime: 1000 * 60 * 2, // 2 minutes - tasks change more frequently
  });
}

export default useGetTasks;
