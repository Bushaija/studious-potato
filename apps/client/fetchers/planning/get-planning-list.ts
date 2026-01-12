import { honoClient as client } from "@/api-client/index";
import type { InferResponseType } from "hono/client";
import { PlanningListParams } from "./types";

export type GetPlanningListResponse = InferResponseType<
    (typeof client)["planning"]["$get"]
>;

export async function getPlanningList(params?: PlanningListParams) {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set('page', params.page);
    if (params?.limit) searchParams.set('limit', params.limit);
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    if (params?.facilityId) searchParams.set('facilityId', params.facilityId);
    if (params?.reportingPeriod) searchParams.set('reportingPeriod', params.reportingPeriod);

    const response = await client.planning.$get({
        query: Object.fromEntries(searchParams)
    });

    if (!response.ok) {
        const error = await response.json() as { message?: string }
        throw new Error(error.message || 'failed to fetch planning data');
    }

    return await response.json();
};
