export interface ReportingPeriod {
    id: number;
    year: number;
    period_type: string;
    start_date: string;
    end_date: string;
    status: string;
    created_at: string;
  }
  
  export interface Facility {
    id: number;
    name: string;
    facility_type: 'hospital' | 'health_center';
    district_id: number;
    district_name?: string;
    province_name?: string;
  }
  
  export interface Category {
    id: number;
    code: string;
    name: string;
    display_order: number;
    sub_category_count?: number;
  }
  
  export interface SubCategory {
    id: number;
    code: string;
    name: string;
    display_order: number;
    category_id: number;
    category_name?: string;
    category_code?: string;
  }
  
  export interface Activity {
    id: number;
    name: string;
    display_order: number;
    category_id: number;
    sub_category_id?: number;
    is_total_row: boolean;
    category_code?: string;
    category_name?: string;
    sub_category_code?: string;
    sub_category_name?: string;
  }
  
  export interface Project {
    id: number;
    name: string;
    status: string;
    created_at: string;
    created_by: string;
    facility_id: number;
    reporting_period_id: number;
    facility_name?: string;
    facility_type?: string;
    year?: number;
    period_type?: string;
    district_name?: string;
    province_name?: string;
  }
  
  export interface ExecutionData {
    id: number;
    reporting_period_id: number;
    activity_id: number;
    project_id: number;
    q1_amount: number;
    q2_amount: number;
    q3_amount: number;
    q4_amount: number;
    cumulative_balance: number;
    comment?: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    activity_name?: string;
    category_name?: string;
    sub_category_name?: string;
    year?: number;
    period_type?: string;
  }
  
  export interface CreateProjectData {
    name: string;
    facility_id: number;
    reporting_period_id: number;
    created_by: string;
  }
  
  export interface CreateExecutionData {
    reporting_period_id: number;
    activity_id: number;
    project_id: number;
    q1_amount: number;
    q2_amount: number;
    q3_amount: number;
    q4_amount: number;
    comment?: string;
    created_by: string;
  }
  
  export interface UpdateExecutionData {
    q1_amount: number;
    q2_amount: number;
    q3_amount: number;
    q4_amount: number;
    comment?: string;
    updated_by: string;
  }
  