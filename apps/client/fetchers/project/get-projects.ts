import { honoClient as client } from "@/api-client/index";

export type GetProjectsRequest = {
  projectType?: string;
  facilityId?: string;
  status?: string;
  userId?: string;
};

async function getProjects({
  projectType,
  facilityId,
  status,
  userId,
}: GetProjectsRequest = {}) {
  const response = await client.projects.$get({
    query: {
      projectType,
      facilityId,
      status,
      userId,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default getProjects;