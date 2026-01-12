import { honoClient as client } from "@/api-client/index";

export type CreateProjectRequest = {
  name: string;
  status?: string;
  code: string;
  description?: string;
  metadata?: Record<string, any>;
};

async function createProject({
  name,
  status,
  code,
  description,
  metadata,
}: CreateProjectRequest) {
  const response = await client.projects.$post({
    json: { name, status, code, description, metadata },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default createProject;