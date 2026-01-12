import { honoClient as client } from "@/api-client/index";

export interface DeleteReportingPeriodRequest {
  id: string | number;
}

async function deleteReportingPeriod({ id }: DeleteReportingPeriodRequest) {
  const response = await (client as any)["reporting-periods"][":id"].$delete({
    param: { id: String(id) },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return true;
}

export default deleteReportingPeriod;

