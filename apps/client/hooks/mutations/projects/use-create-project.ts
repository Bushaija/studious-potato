import createProject from "@/fetchers/project/create-project";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createProject,
    onSuccess: (data) => {
      // Invalidate the projects list query
      queryClient.invalidateQueries({
        queryKey: ["projects"]
      });
      
      // Add the new project to cache
      queryClient.setQueryData(
        ["projects", data.id],
        data
      );
    },
    onError: (error) => {
      console.error("Failed to create project:", error);
    },
  });
}

export default useCreateProject;