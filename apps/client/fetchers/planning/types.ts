export interface PlanningDataEntry {
    id: number;
    schemaId: number;
    entityId?: number;
    entityType: string;
    projectId: number;
    facilityId: number;
    reportingPeriodId?: number;
    formData: Record<string, any>;
    computedValues?: Record<string, any>;
    validationState?: {
        isValid: boolean;
        error?: any[];
        lastValidated?: string;
    };
    metadata?: Record<string, any>;
    createdBy?: number;
    createdAt: string;
    updatedBy?: number;
    updatedAt?: string;
    schema?: any;
    project?: any;
    facility?: any;
    creator?: {
        id: number;
        name: string;
        email: string;
    };
    formDataNamed?: Record<string, any>;
};

export interface PlanningListParams {
    page?: string;
    limit?: string;
    projectId?: string;
    facilityId?: string;
    reportingPeriod?: string;
};

export interface CreatePlanningDataRequest {
    schemaId: number;
    activityId?: number;
    projectId: number;
    facilityId: number;
    reportingPeriodId?: number;
    formData: Record<string, any>;
    metadata?: Record<string, any>;
};

export interface UpdatePlanningDataRequest {
    formData?: Record<string, any>;
    metadata?: Record<string, any>;
    reportingPeriodId?: number;
};

export interface PlanningActivity {
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