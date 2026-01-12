import { useQuery } from "@tanstack/react-query";
import { 
  getCompiledExecution, 
  type GetCompiledExecutionRequest, 
  type GetCompiledExecutionResponse 
} from "@/fetchers/execution/get-compiled-execution";

function useGetCompiledExecution(query: GetCompiledExecutionRequest) {
  // Validate required parameters based on scope
  const hasRequiredParams = () => {
    if (!query) return false;
    
    // Provincial scope requires provinceId
    if (query.scope === 'provincial' && !query.provinceId) {
      return false;
    }
    
    // District scope requires districtId (or will use user's default district)
    // Country scope has no additional requirements
    
    return Object.keys(query as any).length > 0;
  };

  return useQuery<GetCompiledExecutionResponse>({
    queryFn: () => getCompiledExecution(query),
    queryKey: [
      "execution",
      "compiled",
      query?.scope ?? 'district',
      query?.provinceId ?? null,
      query?.projectType ?? null,
      query?.facilityType ?? null,
      query?.reportingPeriodId ?? null,
      query?.year ?? null,
      query?.quarter ?? null,
      query?.districtId ?? null,
    ],
    enabled: hasRequiredParams(),
  });
}

export default useGetCompiledExecution;
