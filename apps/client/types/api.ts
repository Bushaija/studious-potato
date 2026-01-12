export interface APIError {
    message: string;
    status: number;
    code?: string;
};

export interface PaginationParams {
    page?: number;
    limit?: number;
};

export interface PaginationResponse {
    page: number;
    limit: number;
    total: number;
    pages: number;
};

export async function baseFetch<T>(
    request: () => Promise<Response>
  ): Promise<T> {
    try {
      const response = await request();
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = errorText;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorText;
        } catch {
          // Use the raw text if JSON parsing fails
        }
        
        throw new APIError(`API Error: ${errorMessage}`, response.status);
      }
      
      return await response.json();
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        500
      );
    }
  }

 export class APIError extends Error {
    constructor(
      message: string,
      public status: number,
      public code?: string
    ) {
      super(message);
      this.name = 'APIError';
    }
  }