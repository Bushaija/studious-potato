// Version Control Types for Financial Reports

export interface ReportVersion {
  id: number;
  reportId: number;
  versionNumber: string;
  snapshotData: SnapshotData;
  snapshotChecksum: string;
  snapshotTimestamp: string;
  createdBy: number;
  createdAt: string;
  changesSummary: string | null;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface SnapshotData {
  version: string;
  capturedAt: string;
  statementCode: string;
  statement: {
    lines: StatementLine[];
    totals: Record<string, number>;
    metadata: StatementMetadata;
  };
  sourceData: {
    planningEntries: SourceDataEntry[];
    executionEntries: SourceDataEntry[];
  };
  aggregations: {
    totalPlanning: number;
    totalExecution: number;
    variance: number;
    facilityBreakdown?: FacilityBreakdownItem[];
  };
  checksum: string;
}

export interface StatementLine {
  code: string;
  name: string;
  currentValue: number;
  previousValue?: number;
  [key: string]: any;
}

export interface StatementMetadata {
  totalPlanning?: number;
  totalExecution?: number;
  variance?: number;
  facilityBreakdown?: FacilityBreakdownItem[];
  [key: string]: any;
}

export interface SourceDataEntry {
  id: number;
  formData: any;
  updatedAt: string;
}

export interface FacilityBreakdownItem {
  facilityId: number;
  facilityName: string;
  amount: number;
}

export interface VersionDifference {
  lineCode: string;
  lineName: string;
  field: string;
  version1Value: number;
  version2Value: number;
  difference: number;
  percentageChange: number;
}

export interface VersionComparison {
  version1: string;
  version2: string;
  differences: VersionDifference[];
  summary: {
    totalDifferences: number;
    significantChanges: number;
  };
}

export interface CompareVersionsRequest {
  version1: string;
  version2: string;
}
