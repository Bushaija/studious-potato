import deleteProject from "@/fetchers/project/delete-project";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function useDeleteProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteProject,
    onSuccess: (_, variables) => {
      // Remove the specific project from cache
      queryClient.removeQueries({
        queryKey: ["projects", variables.id]
      });
      
      // Invalidate the projects list query
      queryClient.invalidateQueries({
        queryKey: ["projects"]
      });
    },
    onError: (error) => {
      console.error("Failed to delete project:", error);
    },
  });
}

export default useDeleteProject;