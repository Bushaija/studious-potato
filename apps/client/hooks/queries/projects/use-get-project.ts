import getProject from "@/fetchers/project/get-project";
import { useQuery } from "@tanstack/react-query";

export function useGetProject({ id }: { id: string }) {
  return useQuery({
    queryFn: () => getProject({ id }),
    queryKey: ["projects", id],
    enabled: !!id,
  });
};