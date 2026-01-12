import { honoClient as client } from "@/api-client/index";

export type UpdateProjectRequest = {
  id: string;
  data: {
    name: string;
    status?: string;
    code: string;
    description?: string;
    metadata?: Record<string, any>;
  };
};

async function updateProject({ id, data }: UpdateProjectRequest) {
  const response = await (client as any).projects[":id"].$put({
    param: { id },
    json: data,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const responseData = await response.json();
  return responseData;
}

export default updateProject;