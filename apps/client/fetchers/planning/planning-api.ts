import { honoClient as client } from "@/api-client/index";

// Types
export type CreatePlanningDataRequest = {
  schemaId: number;
  activityId: string;
  projectId: number;
  facilityId: number;
  reportingPeriodId?: number;
  formData: {
    frequency: string;
    unit_cost: number;
    q1_count: number;
    q2_count: number;
    q3_count: number;
    q4_count: number;
    comments?: string;
  };
};

export type UpdatePlanningDataRequest = {
  id: string;
  activityId: string;
  projectId: number | string;
  facilityId: number | string;
  reportingPeriodId?: number | string;
  formData: CreatePlanningDataRequest['formData'];
  metadata?: Record<string, any>;
};

export type BulkUpdatePlanningRequest = {
  ids: string[];
  formData: Partial<CreatePlanningDataRequest['formData']>;
};

export type PlanningActivity = {
  id: number;
  name: string;
  code: string;
  activityType: string;
  displayOrder: number;
  isAnnualOnly: boolean;
  isTotalRow: boolean;
  categoryId: number;
  categoryName: string;
  categoryCode: string;
  categoryDisplayOrder: number;
};

export type PlanningFormSchema = {
  id: number;
  name: string;
  version: string;
  schema: any;
  metadata: any;
};

export type PlanningDataEntry = {
  id: number;
  entityId: number;
  formData: any;
  computedValues: any;
  metadata: any;
  activityName: string;
  activityCode: string;
  categoryName: string;
  categoryCode: string;
};

// API Functions

export async function getPlanningActivities(params: {
  projectType: 'HIV' | 'Malaria' | 'TB';
  facilityType: 'hospital' | 'health_center';
}) {
  const response = await (client.planning as any)['activities'].$get({
    query: params
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data.data as PlanningActivity[];
}

export async function getPlanningFormSchema(params: {
  projectType: 'HIV' | 'Malaria' | 'TB';
  facilityType: 'hospital' | 'health_center';
}) {
  const response = await (client.planning as any)['schema'].$get({
    query: params
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data.data as PlanningFormSchema;
}

export async function getPlanningDataSummary(params: {
  projectId: string;
  facilityId: string;
  reportingPeriodId?: string;
}) {
  const response = await (client.planning as any)['summary'].$get({
    query: params
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  const list = data.data as PlanningDataEntry[];
  return list;
}

export async function createPlanningData(input: CreatePlanningDataRequest) {
  const payload = {
    schemaId: Number(input.schemaId),
    projectId: Number(input.projectId),
    facilityId: Number(input.facilityId),
    reportingPeriodId: input.reportingPeriodId != null ? Number(input.reportingPeriodId) : undefined,
    formData: input.formData,
    metadata: undefined as any,
  };
  // Server create endpoint does not take activityId directly; include it inside formData
  const response = await client.planning.$post({
    json: {
      ...payload,
      // send activityId top-level so server can map it to entityId
      activityId: Number(input.activityId),
      metadata: { ...(payload as any).metadata },
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const result = await response.json();
  return result.data;
}

export async function updatePlanningData(data: UpdatePlanningDataRequest) {
  // Send a minimal, safe payload to avoid overwriting identifying fields
  const response = await client.planning[":id"].$put({
    param: { id: data.id },
    json: {
      formData: data.formData,
      // metadata can be included if provided
      ...(data.metadata ? { metadata: data.metadata } : {}),
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const result = await response.json();
  // Server returns the updated record directly. Fall back if no data wrapper.
  return (result as any).data ?? result;
}

export async function bulkUpdatePlanningData(data: BulkUpdatePlanningRequest) {
  const response = await client.planning.bulk.$put({
    json: data
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const result = await response.json();
  return result.data;
}

export async function deletePlanningData(id: string) {
  const response = await client.planning[":id"].$delete({
    param: { id }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const result = await response.json();
  return result.data;
}

export async function bulkDeletePlanningData(ids: string[]) {
  const response = await client.planning.bulk.$delete({
    json: { ids }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const result = await response.json();
  return result.data;
}


