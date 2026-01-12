import { honoClient as client } from "@/api-client/index";
import type { 
  UploadPlanningRequest,
  UploadPlanningResponse
} from "@/features/planning/types";

export async function uploadPlanningFile(request: UploadPlanningRequest): Promise<UploadPlanningResponse> {
  try {
    const response = await (client.planning as any).upload.$post({
      json: request
    });

    if (!response.ok) {
      // Try to get detailed error information from response
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: 'Upload failed' };
      }

      // Create enhanced error object with more context
      const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`) as any;
      error.status = response.status;
      error.code = errorData.code;
      error.stage = errorData.stage;
      error.response = {
        status: response.status,
        data: errorData
      };

      throw error;
    }

    const result = await response.json();
    return result.data || result;
  } catch (error: any) {
    // Handle network errors and other exceptions
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const networkError = new Error('Network connection failed. Please check your internet connection and try again.') as any;
      networkError.code = 'NETWORK_ERROR';
      networkError.category = 'network';
      throw networkError;
    }

    if (error.name === 'AbortError') {
      const timeoutError = new Error('Upload request timed out. Please try again.') as any;
      timeoutError.code = 'TIMEOUT_ERROR';
      timeoutError.category = 'network';
      throw timeoutError;
    }

    // Re-throw with additional context if not already enhanced
    if (!error.status && !error.code) {
      error.code = 'UNKNOWN_ERROR';
      error.category = 'server';
    }

    throw error;
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // Validate file before processing
    if (!file) {
      const error = new Error('No file provided') as any;
      error.code = 'FILE_EMPTY';
      reject(error);
      return;
    }

    if (file.size === 0) {
      const error = new Error('File is empty') as any;
      error.code = 'FILE_EMPTY';
      reject(error);
      return;
    }

    const reader = new FileReader();
    
    reader.onload = () => {
      try {
        const result = reader.result as string;
        
        if (!result) {
          const error = new Error('Failed to read file content') as any;
          error.code = 'FILE_CORRUPTED';
          reject(error);
          return;
        }

        // Remove the data URL prefix (e.g., "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,")
        const base64 = result.split(',')[1];
        
        if (!base64) {
          const error = new Error('Failed to extract file data') as any;
          error.code = 'FILE_CORRUPTED';
          reject(error);
          return;
        }

        resolve(base64);
      } catch (err) {
        const error = new Error('Failed to process file') as any;
        error.code = 'FILE_CORRUPTED';
        error.originalError = err;
        reject(error);
      }
    };
    
    reader.onerror = (event) => {
      const error = new Error('Failed to read file') as any;
      error.code = 'FILE_CORRUPTED';
      error.originalError = event;
      reject(error);
    };

    reader.onabort = () => {
      const error = new Error('File reading was aborted') as any;
      error.code = 'FILE_CORRUPTED';
      reject(error);
    };

    try {
      reader.readAsDataURL(file);
    } catch (err) {
      const error = new Error('Failed to start file reading') as any;
      error.code = 'UNSUPPORTED_BROWSER';
      error.originalError = err;
      reject(error);
    }
  });
}