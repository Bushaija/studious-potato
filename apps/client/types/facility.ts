export interface Program {
    id: string;
    name: string;
};

export interface Facility {
    id: string;
    name: string;
    type: string;
    program?: string;
};

export interface FacilityType {
    id: string;
    label: string;
};

export interface CreatePlanArgs {
    facilityId: string;
    facilityType: string;
    projectId?: string;
    program?: string;
    facilityName?: string;
    reportingPeriodId?: number;
};

export interface CreateExecutionArgs {
    facilityId: string;
    facilityType: string;
    projectId?: string;
    program?: string;
    facilityName?: string;
    reportingPeriodId?: number;
    quarter?: string;
};

export interface FacilityFilterState {
    selectedProgram: string;
    selectedFacilityType: string;
    selectedFacility: string;
};