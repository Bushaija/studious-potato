import { honoClient as client } from "@/api-client/index";

export async function deletePlanning(id: string | number) {
    const response = await (client.planning as any)[":id"].$delete({
      param: { id: String(id) }
    });
  
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete planning data');
    }
  
    return null;
  }
  