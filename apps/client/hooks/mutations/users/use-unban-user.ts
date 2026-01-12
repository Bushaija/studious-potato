import unbanUser from "@/fetchers/accounts/unban-user";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function useUnbanUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: unbanUser,
    onSuccess: (data, variables) => {
      // Invalidate user-related queries
      queryClient.invalidateQueries({
        queryKey: ["users"]
      });
      
      // Update the specific user in cache
      if (data.user) {
        queryClient.setQueryData(
          ["users", data.user.id],
          data.user
        );
      }
    },
    onError: (error) => {
      // Handle errors globally or per mutation
      console.error("Failed to unban user:", error);
    },
  });
}

export default useUnbanUser;
