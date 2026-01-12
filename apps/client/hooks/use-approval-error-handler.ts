import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/api-client/index";

/**
 * Custom hook for handling approval workflow errors with user-friendly messages
 */
export function useApprovalErrorHandler() {
  const { toast } = useToast();

  const handleError = (error: unknown, context?: string) => {
    if (error instanceof ApiError) {
      // Handle specific status codes with contextual messages
      let title = "Error";
      let description = error.getUserMessage();

      switch (error.status) {
        case 403:
          title = "Permission Denied";
          description = context 
            ? `You don't have permission to ${context}.`
            : error.getUserMessage();
          break;
        case 404:
          title = "Not Found";
          description = "The planning record was not found. It may have been deleted.";
          break;
        case 400:
          title = "Invalid Request";
          description = (error.response as any)?.message || error.getUserMessage();
          break;
        case 409:
          title = "Conflict";
          description = (error.response as any)?.message || "This plan has already been processed.";
          break;
        case 422:
          title = "Validation Error";
          description = (error.response as any)?.message || "Please check your input and try again.";
          break;
        case 0:
          title = "Network Error";
          description = "Unable to connect to the server. Please check your internet connection.";
          break;
        case 500:
        case 503:
          title = "Server Error";
          description = "The server encountered an error. Please try again later.";
          break;
        default:
          title = "Error";
          description = error.getUserMessage();
      }

      toast({
        title,
        description,
        variant: "destructive",
      });
    } else if (error instanceof Error) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSuccess = (message: string, description?: string) => {
    toast({
      title: message,
      description,
    });
  };

  return {
    handleError,
    handleSuccess,
  };
}
