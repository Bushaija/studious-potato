import { honoClient as client } from "@/api-client/index";

export interface CreateReportingPeriodRequest {
  year: number;
  periodType: string;
  startDate: string;
  endDate: string;
  status: string;
}

async function createReportingPeriod(body: CreateReportingPeriodRequest) {
  const response = await (client as any)["reporting-periods"].$post({
    json: body,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default createReportingPeriod;

