import { honoClient as client } from "@/api-client/index";

export type GetPlanningActivitiesResponse = {
  data: Array<{
    id: number;
    schemaId: number;
    entityId: number | null;
    entityType: string;
    projectId: number;
    facilityId: number;
    reportingPeriodId: number;
    formData: {
      metadata: Record<string, any>;
      activities: Record<string, any>;
    };
    computedValues: Record<string, any>;
    validationState: {
      isValid: boolean;
      lastValidated: string;
    };
    metadata: {
      projectType: string;
      submittedAt: string;
      facilityType: string;
    };
    createdBy: number;
    createdAt: string;
    updatedBy: number;
    updatedAt: string;
    schema: {
      id: number;
      name: string;
      version: string;
      projectType: string;
      facilityType: string;
      moduleType: string;
      isActive: boolean;
    };
    project: {
      id: number;
      name: string;
      status: string;
      code: string;
      description: string;
      projectType: string;
    };
    facility: {
      id: number;
      name: string;
      facilityType: string;
      districtId: number;
    };
    reportingPeriod: {
      id: number;
      year: number;
      periodType: string;
      startDate: string;
      endDate: string;
      status: string;
    };
    creator: {
      id: number;
      name: string;
      email: string;
    };
    formDataNamed: {
      metadata: Record<string, any>;
      activities: Record<string, any>;
    };
  }>;
  pagination: {
    total: number;
    totalPages: number | null;
  };
};

interface GetPlanningActivitiesParams {
  page?: number;
  limit?: number;
  projectType?: string;
  facilityType?: string;
  facilityName?: string;
  search?: string;
  reportingPeriodId?: number;
  reportingPeriod?: string;
  categoryId?: string;
  year?: string;
}

async function getPlanningActivities(params: GetPlanningActivitiesParams = {}) {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.projectType) searchParams.set('projectType', params.projectType);
  if (params.facilityType) searchParams.set('facilityType', params.facilityType);
  if (params.facilityName) searchParams.set('facilityName', params.facilityName);
  if (params.search) searchParams.set('search', params.search);
  if (params.reportingPeriodId) searchParams.set('reportingPeriodId', params.reportingPeriodId.toString());
  if (params.reportingPeriod) searchParams.set('reportingPeriod', params.reportingPeriod);
  if (params.categoryId) searchParams.set('categoryId', params.categoryId);
  if (params.year) searchParams.set('year', params.year);

  const response = await (client as any)["planning"].$get({
    query: Object.fromEntries(searchParams)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as GetPlanningActivitiesResponse;
}

export default getPlanningActivities;
