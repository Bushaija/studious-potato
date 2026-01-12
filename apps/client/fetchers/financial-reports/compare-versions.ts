import { honoClient as client } from "@/api-client/index";
import type { VersionComparison, CompareVersionsRequest } from "@/types/version-control";

export async function compareVersions(
  reportId: number | string,
  request: CompareVersionsRequest
): Promise<VersionComparison> {
  const response = await (client as any)["financial-reports"][":id"]["versions"]["compare"].$post({
    param: { id: reportId.toString() },
    json: request,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Failed to compare versions");
  }

  const data = await response.json();
  return data as VersionComparison;
}
