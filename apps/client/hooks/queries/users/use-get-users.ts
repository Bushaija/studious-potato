import getUsers from "@/fetchers/users/get-users";
import { useQuery } from "@tanstack/react-query";

export function useGetUsers({
  page,
  limit,
  role,
  facilityId,
  isActive,
  search,
}: Parameters<typeof getUsers>[0] = {}) {
  return useQuery({
    queryFn: () => getUsers({ page, limit, role, facilityId, isActive, search }),
    queryKey: ["users", "list", { page, limit, role, facilityId, isActive, search }],
    // Enable query by default since it's a list operation
  });
};
