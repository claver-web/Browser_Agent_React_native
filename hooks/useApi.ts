import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { apiClient, setAuthTokenGetter } from '../lib/api-client';
import { AxiosRequestConfig, AxiosError } from 'axios';
import { ApiResponse, ApiError } from '../types';

/**
 * Hook to initialize the API client with the Clerk auth token.
 * Call this once at the root level of your authenticated app component.
 */
export function useApiSetup() {
  const { getToken } = useAuth();
  
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);
}

interface UseQueryOptions<T> extends AxiosRequestConfig {
  enabled?: boolean;
}

/**
 * Generic hook for GET requests.
 */
export function useQuery<T>(url: string, options?: UseQueryOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(options?.enabled !== false);
  const [error, setError] = useState<ApiError | null>(null);
  
  const { enabled = true, ...axiosConfig } = options || {};

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<ApiResponse<T>>(url, axiosConfig);
      setData(response.data.data);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setError({
        message: axiosError.response?.data?.message || axiosError.message || 'An error occurred',
        status: axiosError.response?.status || 500,
        errors: axiosError.response?.data?.errors,
      });
    } finally {
      setLoading(false);
    }
  }, [url, enabled, JSON.stringify(axiosConfig)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

type HttpMethod = 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface UseMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData) => void;
  onError?: (error: ApiError) => void;
}

/**
 * Generic hook for POST/PUT/DELETE/PATCH requests.
 */
export function useMutation<TData, TVariables>(
  url: string, 
  method: HttpMethod = 'POST',
  options?: UseMutationOptions<TData, TVariables>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const mutate = async (variables: TVariables): Promise<TData | undefined> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.request<ApiResponse<TData>>({
        url,
        method,
        data: variables,
      });
      
      const responseData = response.data.data;
      if (options?.onSuccess) {
        options.onSuccess(responseData);
      }
      return responseData;
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      const apiError: ApiError = {
        message: axiosError.response?.data?.message || axiosError.message || 'An error occurred',
        status: axiosError.response?.status || 500,
        errors: axiosError.response?.data?.errors,
      };
      
      setError(apiError);
      if (options?.onError) {
        options.onError(apiError);
      }
      throw apiError;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}
