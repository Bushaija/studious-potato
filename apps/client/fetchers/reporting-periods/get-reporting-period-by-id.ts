import { honoClient as client } from "@/api-client/index";

export interface GetReportingPeriodByIdRequest {
  id: string | number;
}

async function getReportingPeriodById({ id }: GetReportingPeriodByIdRequest) {
  const response = await (client as any)["reporting-periods"][":id"].$get({
    param: { id: String(id) },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default getReportingPeriodById;

