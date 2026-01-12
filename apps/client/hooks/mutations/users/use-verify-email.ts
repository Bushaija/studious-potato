import verifyEmail from "@/fetchers/accounts/verify-email";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

export function useVerifyEmail() {
  return useMutation({
    mutationFn: verifyEmail,
    onSuccess: (data) => {
      // Show success message
      toast({
        title: "Email Verified",
        description: data.message || "Your email has been verified successfully.",
      });
    },
    onError: (error) => {
      // Show error message
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.message || "Failed to verify email. The link may have expired or is invalid.",
      });
    },
  });
}

export default useVerifyEmail;
