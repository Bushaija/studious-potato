import { useQuery } from "@tanstack/react-query";
import { 
  getFinancialReportById, 
  type GetFinancialReportByIdResponse 
} from "@/fetchers/financial-reports/get-financial-report-by-id";

export type ReportStatus = 
  | 'draft'
  | 'pending_daf_approval'
  | 'rejected_by_daf'
  | 'approved_by_daf'
  | 'rejected_by_dg'
  | 'fully_approved';

export interface FinancialReportMetadata {
  id: number;
  status: ReportStatus;
  createdAt: string;
  createdBy: number | null;
  createdByName?: string;
  dafId: number | null;
  dafName?: string;
  dafApprovedAt: string | null;
  locked: boolean;
}

interface UseFinancialReportMetadataOptions {
  reportId: number | null;
  enabled?: boolean;
}

export function useFinancialReportMetadata({
  reportId,
  enabled = true
}: UseFinancialReportMetadataOptions) {
  const query = useQuery<GetFinancialReportByIdResponse, Error>({
    queryFn: () => getFinancialReportById(reportId!),
    queryKey: ["financial-report-metadata", reportId],
    enabled: enabled && reportId !== null && reportId !== undefined,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
  });

  // Extract metadata fields from the full report response
  const metadata: FinancialReportMetadata | null = query.data ? {
    id: query.data.id,
    status: query.data.status as ReportStatus,
    createdAt: query.data.createdAt,
    createdBy: query.data.createdBy,
    createdByName: query.data.creator?.name,
    dafId: query.data.dafId,
    dafName: query.data.dafApprover?.name,
    dafApprovedAt: query.data.dafApprovedAt,
    locked: query.data.locked,
  } : null;

  return {
    metadata,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
