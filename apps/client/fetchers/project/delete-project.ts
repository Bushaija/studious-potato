import { honoClient as client } from "@/api-client/index";

export type DeleteProjectRequest = {
  id: string;
};

async function deleteProject({ id }: DeleteProjectRequest) {
  const response = await (client as any).projects[":id"].$delete({
    param: { id },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  // DELETE returns 204 No Content, so no JSON response
  return;
}

export default deleteProject;