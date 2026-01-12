import { useState, useCallback } from 'react';

type AsyncStatus = 'idle' | 'pending' | 'success' | 'error';

interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: Error | null;
}

export function useAsync<T, P extends any[]>(asyncFunction: (...args: P) => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({
    status: 'idle',
    data: null,
    error: null,
  });

  const execute = useCallback(async (...args: P) => {
    setState(prevState => ({ ...prevState, status: 'pending', error: null }));
    try {
      const result = await asyncFunction(...args);
      setState({ status: 'success', data: result, error: null });
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred.');
      setState({ status: 'error', data: null, error: error });
      throw error; // Re-throw for the calling component to handle if needed
    }
  }, [asyncFunction]);

  return {
    ...state,
    isLoading: state.status === 'pending',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    execute,
  };
} 