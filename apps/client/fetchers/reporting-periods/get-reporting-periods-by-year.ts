import { honoClient as client } from "@/api-client/index";

export interface GetReportingPeriodsByYearRequest {
  year: number;
}

async function getReportingPeriodsByYear({ year }: GetReportingPeriodsByYearRequest) {
  const response = await (client as any)["reporting-periods"].year[":year"].$get({
    param: { year: String(year) },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default getReportingPeriodsByYear;

