import forgotPassword from "@/fetchers/accounts/forgot-password";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

export function useForgotPassword() {
  return useMutation({
    mutationFn: forgotPassword,
    onSuccess: (data) => {
      // Show success message
      toast({
        title: "Email Sent",
        description: data.message || "Password reset instructions have been sent to your email.",
      });
    },
    onError: (error) => {
      // Show error toast
      toast({
        variant: "destructive",
        title: "Request Failed",
        description: error.message || "Failed to send password reset email. Please try again.",
      });
    },
  });
}

export default useForgotPassword;
