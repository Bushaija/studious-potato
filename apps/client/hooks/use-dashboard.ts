/**
 * Unified Dashboard Hook
 * 
 * React hook for fetching multiple dashboard components in a single API call
 * with unified filter management and error isolation.
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useDashboard({
 *   components: ['metrics', 'programDistribution', 'tasks'],
 *   filters: {
 *     scope: 'district',
 *     scopeId: 12,
 *     projectType: 'HIV',
 *     quarter: 2
 *   }
 * });
 * ```
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type {
  DashboardComponent,
  DashboardFilters,
  UnifiedDashboardResponse,
} from '@/types/dashboard';

// ============================================================================
// Hook Options Interface
// ============================================================================

export interface UseDashboardOptions {
  /**
   * Array of component names to fetch
   * @example ['metrics', 'programDistribution', 'tasks']
   */
  components: DashboardComponent[];
  
  /**
   * Filter parameters applied to all components
   */
  filters?: DashboardFilters;
  
  /**
   * Whether the query should be enabled
   * @default true
   */
  enabled?: boolean;
  
  /**
   * Additional React Query options
   */
  queryOptions?: Omit<
    UseQueryOptions<UnifiedDashboardResponse, Error>,
    'queryKey' | 'queryFn'
  >;
}

// ============================================================================
// API Fetcher Function
// ============================================================================

async function fetchDashboardData(
  components: DashboardComponent[],
  filters?: DashboardFilters
): Promise<UnifiedDashboardResponse> {
  // Build query parameters
  const params = new URLSearchParams();
  
  // Add components parameter (required)
  params.append('components', components.join(','));
  
  // Add filter parameters (optional)
  if (filters?.scope) {
    params.append('scope', filters.scope);
  }
  
  if (filters?.scopeId !== undefined) {
    params.append('scopeId', filters.scopeId.toString());
  }
  
  if (filters?.projectType !== undefined) {
    params.append('projectType', filters.projectType);
  }
  
  if (filters?.periodId !== undefined) {
    params.append('periodId', filters.periodId.toString());
  }
  
  if (filters?.quarter !== undefined) {
    params.append('quarter', filters.quarter.toString());
  }
  
  // Make API request
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/dashboard?${params.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Failed to fetch dashboard data: ${response.status}`);
  }
  
  const data = await response.json();
  return data;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for fetching unified dashboard data
 * 
 * Features:
 * - Single API call for multiple components
 * - Unified filter management across all components
 * - Error isolation per component
 * - Single loading state for entire dashboard
 * - Automatic caching and refetching with React Query
 * 
 * @param options - Hook configuration options
 * @returns React Query result with dashboard data
 */
export function useDashboard({
  components,
  filters,
  enabled = true,
  queryOptions,
}: UseDashboardOptions) {
  // Build query key for caching
  // Include components and filters to ensure proper cache invalidation
  const queryKey = ['dashboard', 'unified', components.sort(), filters];
  
  return useQuery({
    queryKey,
    queryFn: () => fetchDashboardData(components, filters),
    enabled: enabled && components.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...queryOptions,
  });
}

export default useDashboard;
