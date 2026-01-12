import { honoClient as client } from "@/api-client/index";
import type { ReportVersion } from "@/types/version-control";

export interface GetReportVersionsResponse {
  reportId: number;
  currentVersion: string;
  versions: ReportVersion[];
}

export async function getReportVersions(reportId: number | string): Promise<GetReportVersionsResponse> {
  const response = await (client as any)["financial-reports"][":id"]["versions"].$get({
    param: { id: reportId.toString() },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Failed to fetch report versions");
  }

  const data = await response.json();
  return data as GetReportVersionsResponse;
}
