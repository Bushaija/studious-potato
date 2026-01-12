import { FinancialRow } from "@/features/execution/schemas/execution-form-schema"
import { ReportTitleProps } from "@/components/share/title-section"
import type { SQL } from "drizzle-orm";

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type EmptyProps<T extends React.ElementType> = Omit<
  React.ComponentProps<T>,
  keyof React.ComponentProps<T>
>;

export interface SearchParams {
  [key: string]: string | string[] | undefined;
}

export interface QueryBuilderOpts {
  where?: SQL;
  orderBy?: SQL;
  distinct?: boolean;
  nullish?: boolean;
}

// Type for selection options
export interface SelectionOption {
  value: string
  label: string
}

// Type for selection handlers
export interface SelectionHandlers {
  onHealthCenterChange?: (value: string) => void
  onReportingPeriodChange?: (value: string) => void
}

// Extended interface that includes both table data and metadata
export interface FinancialTableDataPayload {
  tableData: FinancialRow[]
  metadata: {
    /**
     * Name of the project/program (e.g., "hiv").
     * Optional to keep the interface backwards-compatible.
     */
    project?: string

    /**
     * Human-readable name of the facility (e.g., "Busogo").
     * Replaces the former `healthCenter` key but maintained for compatibility.
     */
    healthFacility?: string
    /** @deprecated Use `healthFacility` instead. */
    healthCenter?: string

    /** Facility type – e.g., "health_center", "hospital". */
    healthFacilityType?: string

    /** District name where the facility is located. */
    district?: string

    reportingPeriod?: string
    fiscalYear?: string

    mode?: 'create' | 'view' | 'edit'
    status?: 'draft' | 'submitted' | 'approved' | 'rejected'
    lastUpdated?: string

    /** Database identifier of the facility. */
    facilityId?: number
    /** Redundant human-readable facility name (alias of healthFacility). */
    facilityName?: string

    /** Numeric id of the reporting period (if available). */
    reportingPeriodId?: number

    /** Numeric id of the project/program. */
    projectId?: number
    /** Human-readable project name (alias of project). */
    projectName?: string

    /** User id of the author submitting the report. */
    authorId?: number
  }
}

// Props for FinancialTable component
export interface FinancialTableProps {
  data?: FinancialRow[]
  fiscalYear?: number | string
  onSave?: (data: FinancialTableDataPayload) => void
  readOnly?: boolean
  expandedRowIds?: string[]
  // Selection props
  healthCenters?: SelectionOption[]
  selectedFacility?: string
  selectedReportingPeriod?: string
  isHospitalMode?: boolean
  onHealthCenterChange?: (value: string) => void
  onProgramChange?: (value: string) => void
  onFiscalYearChange?: (value: string) => void
  programName?: string
}

// Helper component for rendering numeric input cells
export interface NumericInputCellProps {
  rowId: string
  field: string
  value: number | undefined
  readOnly: boolean
  label: string
}

// Financial Reports Types
export type * from "./financial-reports";

// Version Control Types
export type * from "./version-control";

// Period Lock Types
export type * from "./period-locks";

// Financial Reports Approval Types
export type * from "./financial-reports-approval";

// Dashboard Types
export type * from "./dashboard";
