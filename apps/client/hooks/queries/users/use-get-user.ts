import getUser from "@/fetchers/users/get-user";
import { useQuery } from "@tanstack/react-query";

export function useGetUser({ userId }: { userId: string | number }) {
  return useQuery({
    queryFn: () => getUser({ userId: userId.toString() }),
    queryKey: ["users", userId],
    enabled: !!userId, // Enable only when userId exists
  });
};
