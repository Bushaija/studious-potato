import getProjects from "@/fetchers/project/get-projects";
import { useQuery } from "@tanstack/react-query";
import type { GetProjectsRequest } from "@/fetchers/project/get-projects";

export function useGetProjects(params?: GetProjectsRequest) {
  return useQuery({
    queryFn: () => getProjects(params || {}),
    queryKey: ["projects", params],
    enabled: true, // Always enabled since params are optional
  });
};