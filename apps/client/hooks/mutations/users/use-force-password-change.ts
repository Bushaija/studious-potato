import forcePasswordChange from "@/fetchers/accounts/force-password-change";
import { authClient } from "@/lib/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";

export function useForcePasswordChange() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: forcePasswordChange,
    onSuccess: () => {
      // Invalidate session query to refresh user data
      queryClient.invalidateQueries({
        queryKey: ["better-auth.session"],
      });

      // Show success toast
      toast({
        title: "Password Changed",
        description: "Your password has been changed successfully.",
      });

      // Redirect to dashboard
      router.push("/dashboard");
    },
    onError: (error) => {
      // Show error toast
      toast({
        variant: "destructive",
        title: "Password Change Failed",
        description: error.message || "Failed to change password. Please try again.",
      });
    },
  });
}

export default useForcePasswordChange;
