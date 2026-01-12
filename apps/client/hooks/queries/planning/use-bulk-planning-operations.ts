import { CreatePlanningDataRequest, UpdatePlanningDataRequest } from "@/fetchers/planning/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface BulkCreateOperation {
  type: 'create';
  data: CreatePlanningDataRequest;
}

interface BulkUpdateOperation {
  type: 'update';
  id: string | number;
  data: UpdatePlanningDataRequest;
}

interface BulkDeleteOperation {
  type: 'delete';
  id: string | number;
}

type BulkOperation = BulkCreateOperation | BulkUpdateOperation | BulkDeleteOperation;

export function useBulkPlanningOperations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (operations: BulkOperation[]) => {
      const results = [];
      
      for (const operation of operations) {
        try {
          let result;
          switch (operation.type) {
            case 'create':
              const { createPlanning } = await import("@/fetchers/planning/create-planning");
              result = await createPlanning(operation.data);
              break;
            case 'update':
              const { updatePlanning } = await import("@/fetchers/planning/update-planning");
              result = await updatePlanning(operation.id, operation.data);
              break;
            case 'delete':
              const { deletePlanning } = await import("@/fetchers/planning/delete-planning");
              result = await deletePlanning(operation.id);
              break;
          }
          results.push({ success: true, result, operation });
        } catch (error) {
          results.push({ success: false, error, operation });
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      // Invalidate all planning queries
      queryClient.invalidateQueries({ queryKey: ["planning"] });
      
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      if (successCount > 0) {
        toast.success(`${successCount} operations completed successfully`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} operations failed`);
      }
    },
    onError: (error: Error) => {
      toast.error("Bulk operation failed: " + error.message);
    },
  });
}