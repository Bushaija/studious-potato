import { honoClient as client } from "@/api-client/index";

export interface UpdateReportingPeriodRequest {
  id: string | number;
  year?: number;
  periodType?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

async function updateReportingPeriod({ id, ...body }: UpdateReportingPeriodRequest) {
  const response = await (client as any)["reporting-periods"][":id"].$patch({
    param: { id: String(id) },
    json: body,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default updateReportingPeriod;

