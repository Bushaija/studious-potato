import { useEffect, useState, useCallback } from 'react';
import { 
  getSchemas, 
  getSchema, 
  getSchemasByModule,
  getActiveSchemas,
  getSchemasByFacilityAndProject,
  type GetSchemasParams,
  type GetSchemasResponse,
  type GetSchemaResponse 
} from '@/fetchers/schemas/schema';

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseSchemasOptions extends GetSchemasParams {
  enabled?: boolean;
  refetchOnMount?: boolean;
}

interface UseSchemaOptions {
  enabled?: boolean;
}

// Main schemas hook with filtering
export function useSchemas(options: UseSchemasOptions = {}) {
  const { enabled = true, refetchOnMount = true, ...params } = options;
  const [state, setState] = useState<UseAsyncState<GetSchemasResponse>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchSchemas = useCallback(async () => {
    if (!enabled) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await getSchemas(params);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ 
        data: null, 
        loading: false, 
        error: error instanceof Error ? error : new Error('Unknown error') 
      });
    }
  }, [enabled, JSON.stringify(params)]);

  useEffect(() => {
    if (refetchOnMount) {
      fetchSchemas();
    }
  }, [fetchSchemas, refetchOnMount]);

  return {
    ...state,
    refetch: fetchSchemas,
    schemas: state.data?.data || [],
    pagination: state.data?.pagination,
  };
}

// Single schema hook
export function useSchema(id: number, options: UseSchemaOptions = {}) {
  const { enabled = true } = options;
  const [state, setState] = useState<UseAsyncState<GetSchemaResponse>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchSchema = useCallback(async () => {
    if (!enabled || !id) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await getSchema({ id });
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ 
        data: null, 
        loading: false, 
        error: error instanceof Error ? error : new Error('Unknown error') 
      });
    }
  }, [id, enabled]);

  useEffect(() => {
    fetchSchema();
  }, [fetchSchema]);

  return {
    ...state,
    refetch: fetchSchema,
    schema: state.data,
  };
}

// Specialized hook for schemas by module type
export function useSchemasByModule(
  moduleType: 'planning' | 'execution' | 'reporting',
  additionalFilters: Omit<GetSchemasParams, 'moduleType'> = {},
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;
  const [state, setState] = useState<UseAsyncState<GetSchemasResponse>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchSchemas = useCallback(async () => {
    if (!enabled) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await getSchemasByModule(moduleType, additionalFilters);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ 
        data: null, 
        loading: false, 
        error: error instanceof Error ? error : new Error('Unknown error') 
      });
    }
  }, [moduleType, JSON.stringify(additionalFilters), enabled]);

  useEffect(() => {
    fetchSchemas();
  }, [fetchSchemas]);

  return {
    ...state,
    refetch: fetchSchemas,
    schemas: state.data?.data || [],
    pagination: state.data?.pagination,
  };
}

// Hook for context-aware schema loading
export function useContextualSchemas(
  facilityType: 'hospital' | 'health_center',
  projectType: 'HIV' | 'Malaria' | 'TB',
  moduleType?: 'planning' | 'execution' | 'reporting',
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;
  const [state, setState] = useState<UseAsyncState<GetSchemasResponse>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchSchemas = useCallback(async () => {
    if (!enabled) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await getSchemasByFacilityAndProject(
        facilityType,
        projectType,
        moduleType
      );
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ 
        data: null, 
        loading: false, 
        error: error instanceof Error ? error : new Error('Unknown error') 
      });
    }
  }, [facilityType, projectType, moduleType, enabled]);

  useEffect(() => {
    fetchSchemas();
  }, [fetchSchemas]);

  return {
    ...state,
    refetch: fetchSchemas,
    schemas: state.data?.data || [],
    pagination: state.data?.pagination,
  };
}

// Advanced hook with caching and optimistic updates
export function useSchemasWithCache(
  params: GetSchemasParams = {},
  cacheKey?: string
) {
  const key = cacheKey || JSON.stringify(params);
  const [cache, setCache] = useState<Map<string, GetSchemasResponse>>(new Map());
  const [state, setState] = useState<UseAsyncState<GetSchemasResponse>>({
    data: cache.get(key) || null,
    loading: false,
    error: null,
  });

  const fetchSchemas = useCallback(async (force = false) => {
    const cachedData = cache.get(key);
    
    if (cachedData && !force) {
      setState({ data: cachedData, loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await getSchemas(params);
      setCache(prev => new Map(prev).set(key, data));
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ 
        data: cachedData || null, 
        loading: false, 
        error: error instanceof Error ? error : new Error('Unknown error') 
      });
    }
  }, [key, JSON.stringify(params), cache]);

  const invalidateCache = useCallback((targetKey?: string) => {
    if (targetKey) {
      setCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(targetKey);
        return newCache;
      });
    } else {
      setCache(new Map());
    }
  }, []);

  useEffect(() => {
    fetchSchemas();
  }, [fetchSchemas]);

  return {
    ...state,
    refetch: () => fetchSchemas(true),
    schemas: state.data?.data || [],
    pagination: state.data?.pagination,
    invalidateCache,
    isCached: cache.has(key),
  };
}