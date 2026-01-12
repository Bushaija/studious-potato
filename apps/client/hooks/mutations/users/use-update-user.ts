import updateUser from "@/fetchers/users/update-user";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateUser,
    onSuccess: (data, variables) => {
      // Invalidate user-related queries
      queryClient.invalidateQueries({
        queryKey: ["users"]
      });
      
      // Update the specific user in cache
      queryClient.setQueryData(
        ["users", variables.userId],
        data
      );
    },
    onError: (error) => {
      console.error("Failed to update user:", error);
    },
  });
}

export default useUpdateUser;
