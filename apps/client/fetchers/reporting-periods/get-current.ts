import { honoClient as client } from "@/api-client/index";

export type GetCurrentReportingPeriodResponse = any;

async function getCurrentReportingPeriod() {
  
  try {
    const response = await (client as any)["reporting-periods"].current.$get();
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ [getCurrentReportingPeriod] API error:', error);
      throw new Error(error);
    }

    const data = await response.json();
    return data as GetCurrentReportingPeriodResponse;
  } catch (error) {
    throw error;
  }
}

export default getCurrentReportingPeriod;

