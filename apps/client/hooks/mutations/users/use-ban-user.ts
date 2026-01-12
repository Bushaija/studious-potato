import banUser from "@/fetchers/accounts/ban-user";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function useBanUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: banUser,
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
      console.error("Failed to ban user:", error);
    },
  });
}

export default useBanUser;
