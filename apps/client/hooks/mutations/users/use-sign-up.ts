import signUp from "@/fetchers/accounts/sign-up";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useSignUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signUp,
    onSuccess: (data) => {
      // Invalidate user-related queries
      queryClient.invalidateQueries({
        queryKey: ["users"]
      });

      // Optionally add the new user to cache
      if (data.user) {
        queryClient.setQueryData(
          ["users", data.user.id],
          data.user
        );
      }
    },
    onError: (error) => {
      // Handle errors globally or per mutation
      console.error("Failed to sign up user:", error);
    },
  });
}
