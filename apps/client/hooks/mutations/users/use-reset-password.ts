import resetPassword from "@/fetchers/accounts/reset-password";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";

export function useResetPassword() {
  const router = useRouter();

  return useMutation({
    mutationFn: resetPassword,
    onSuccess: (data) => {
      // Show success toast
      toast({
        title: "Password Reset Successful",
        description: data.message || "Your password has been reset successfully. You can now sign in with your new password.",
      });

      // Redirect to sign-in page
      router.push("/sign-in");
    },
    onError: (error) => {
      // Show error toast
      toast({
        variant: "destructive",
        title: "Password Reset Failed",
        description: error.message || "Failed to reset password. The link may have expired or is invalid.",
      });
    },
  });
}

export default useResetPassword;
