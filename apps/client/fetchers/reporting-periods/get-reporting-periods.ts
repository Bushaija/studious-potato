import { honoClient as client } from "@/api-client/index";

export interface GetReportingPeriodsRequest {
  year?: number;
  periodType?: string;
  status?: string;
  startYear?: number;
  endYear?: number;
  limit?: number;
  offset?: number;
}

async function getReportingPeriods(query: GetReportingPeriodsRequest = {}) {
  const response = await (client as any)["reporting-periods"].$get({
    query: Object.fromEntries(
      Object.entries(query).filter(([, v]) => v !== undefined && v !== null)
    ),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default getReportingPeriods;

