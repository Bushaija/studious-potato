import { hc } from "hono/client";
import type { router } from "@/routes/index"

const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL}`

export const honoClient = hc<router>(API_BASE_URL, {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, {
      ...init,
      credentials: 'include',
    });
  },
});

export type HonoClient = typeof honoClient;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * Get a user-friendly error message based on the status code
   */
  getUserMessage(): string {
    switch (this.status) {
      case 400:
        return this.response?.message || 'Invalid request. Please check your input and try again.';
      case 401:
        return 'You are not authenticated. Please log in and try again.';
      case 403:
        return this.response?.message || 'You do not have permission to perform this action.';
      case 404:
        return this.response?.message || 'The requested resource was not found.';
      case 409:
        return this.response?.message || 'This action conflicts with the current state.';
      case 422:
        return this.response?.message || 'Validation failed. Please check your input.';
      case 500:
        return 'An internal server error occurred. Please try again later.';
      case 503:
        return 'The service is temporarily unavailable. Please try again later.';
      case 0:
        return 'Network error. Please check your connection and try again.';
      default:
        return this.message || 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Check if this is a network error
   */
  isNetworkError(): boolean {
    return this.status === 0;
  }

  /**
   * Check if this is a permission error
   */
  isPermissionError(): boolean {
    return this.status === 403 || this.status === 401;
  }

  /**
   * Check if this is a validation error
   */
  isValidationError(): boolean {
    return this.status === 400 || this.status === 422;
  }
}

export async function handleHonoResponse<T>(
  honoPromise: Promise<Response>
): Promise<T> {
  try {
    const response = await honoPromise;
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Handle network errors and other exceptions
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError('Network error. Please check your connection and try again.', 0, error);
    }
    
    throw new ApiError('An unexpected error occurred. Please try again.', 0, error);
  }
}

export type ErrorSchema = {
  error: {
    issues: {
      code: string;
      path: (string | number)[];
      message?: string | undefined;
    }[];
    name: string;
  };
  success: boolean;
};

// Export planning approval module
export * from './planning-approval';