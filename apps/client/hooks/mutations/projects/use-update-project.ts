import updateProject from "@/fetchers/project/update-project";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function useUpdateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateProject,
    onSuccess: (data, variables) => {
      // Invalidate the specific project query
      queryClient.invalidateQueries({
        queryKey: ["projects", variables.id]
      });
      
      // Invalidate the projects list query
      queryClient.invalidateQueries({
        queryKey: ["projects"]
      });
      
      // Update the specific project in cache
      queryClient.setQueryData(
        ["projects", variables.id],
        data
      );
    },
    onError: (error) => {
      console.error("Failed to update project:", error);
    },
  });
}

export default useUpdateProject;