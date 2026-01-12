import { honoClient as client } from "@/api-client/index";

export type GetProjectRequest = {
  id: string;
};

async function getProject({ id }: GetProjectRequest) {
  const response = await (client as any).projects[":id"].$get({
    param: { id },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default getProject;