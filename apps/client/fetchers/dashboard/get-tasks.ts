export interface GetTasksRequest {
  facilityId?: string | number;
}

export interface TasksResponse {
  pendingPlans: Array<{
    projectId: number;
    projectName: string;
    projectCode: string;
    reportingPeriodId: number;
    reportingPeriodYear: number;
    deadline: string | null;
    status: string;
  }>;
  pendingExecutions: Array<{
    projectId: number;
    projectName: string;
    projectCode: string;
    reportingPeriodId: number;
    reportingPeriodYear: number;
    quarter: number | null;
    deadline: string | null;
    status: string;
  }>;
  correctionsRequired: Array<{
    id: number;
    entityType: 'planning' | 'execution';
    projectId: number;
    projectName: string;
    projectCode: string;
    reportingPeriodId: number;
    reportingPeriodYear: number;
    quarter: number | null;
    feedback: string | null;
    updatedAt: string;
  }>;
  upcomingDeadlines: Array<{
    reportingPeriodId: number;
    year: number;
    periodType: string;
    endDate: string;
    daysRemaining: number;
  }>;
}

async function getTasks(params: GetTasksRequest = {}): Promise<TasksResponse> {
  const queryParams = new URLSearchParams();
  
  if (params.facilityId) {
    queryParams.append('facilityId', params.facilityId.toString());
  }

  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/dashboard/accountant/tasks${
    queryParams.toString() ? `?${queryParams.toString()}` : ''
  }`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default getTasks;
