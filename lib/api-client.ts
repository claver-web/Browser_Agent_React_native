import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { Alert } from 'react-native';
import { API_BASE_URL } from './constants';
import { ApiError } from '../types';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let getAuthToken: (() => Promise<string | null>) | null = null;

// Function to inject the Clerk token getter from a component or hook
export const setAuthTokenGetter = (getter: () => Promise<string | null>) => {
  getAuthToken = getter;
};

// Request Interceptor
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (getAuthToken) {
      try {
        const token = await getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Error getting auth token:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor for global error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError<ApiError>) => {
    if (!error.response) {
      // Network error (no response received)
      Alert.alert('Network Error', 'Please check your internet connection.');
    } else {
      const status = error.response.status;
      if (status >= 500) {
        Alert.alert('Server Error', 'Something went wrong on our end. Please try again later.');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
