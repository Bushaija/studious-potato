import { honoClient as client } from "@/api-client/index";
import { normalizeFormData } from "./utils";

export async function calculatePlanningTotals(data: {
    planningId?: number;
    data: Record<string, any>;
  }) {
    const response = await (client.planning as any)["calculate-totals"].$post({
      json: {
        ...data,
        data: normalizeFormData(data.data)
      }
    });
  
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to calculate totals');
    }
  
    return await response.json();
  }