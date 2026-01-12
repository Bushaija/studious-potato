/**
 * Dashboard error handling utilities
 * Provides user-friendly error messages based on HTTP status codes
 */

export interface DashboardError extends Error {
  statusCode?: number;
  isNetworkError?: boolean;
  isPermissionError?: boolean;
  isServerError?: boolean;
}

/**
 * Parse and enhance error messages for dashboard components
 */
export function parseDashboardError(error: unknown): DashboardError {
  if (error instanceof Error) {
    const dashboardError = error as DashboardError;

    // Check for network errors
    if (
      error.message.includes("fetch") ||
      error.message.includes("network") ||
      error.message.includes("Failed to fetch")
    ) {
      dashboardError.isNetworkError = true;
      dashboardError.message =
        "Unable to connect to the server. Please check your internet connection.";
      return dashboardError;
    }

    // Check for permission errors (403)
    if (error.message.includes("403") || error.message.includes("Forbidden")) {
      dashboardError.isPermissionError = true;
      dashboardError.statusCode = 403;
      dashboardError.message =
        "You do not have permission to view this data.";
      return dashboardError;
    }

    // Check for server errors (500)
    if (
      error.message.includes("500") ||
      error.message.includes("Internal Server Error")
    ) {
      dashboardError.isServerError = true;
      dashboardError.statusCode = 500;
      dashboardError.message =
        "An error occurred while loading dashboard data. Please try again later.";
      return dashboardError;
    }

    // Check for authentication errors (401)
    if (
      error.message.includes("401") ||
      error.message.includes("Unauthorized")
    ) {
      dashboardError.statusCode = 401;
      dashboardError.message =
        "Your session has expired. Please log in again.";
      return dashboardError;
    }

    // Check for bad request errors (400)
    if (error.message.includes("400") || error.message.includes("Bad Request")) {
      dashboardError.statusCode = 400;
      dashboardError.message =
        "Invalid request parameters. Please check your filters.";
      return dashboardError;
    }

    return dashboardError;
  }

  // Unknown error
  const unknownError = new Error(
    "An unexpected error occurred. Please try again."
  ) as DashboardError;
  return unknownError;
}

/**
 * Log dashboard errors to console (and monitoring service in production)
 */
export function logDashboardError(
  error: DashboardError,
  context: {
    component: string;
    action: string;
    params?: Record<string, unknown>;
  }
): void {
  console.error("[Dashboard Error]", {
    message: error.message,
    statusCode: error.statusCode,
    isNetworkError: error.isNetworkError,
    isPermissionError: error.isPermissionError,
    isServerError: error.isServerError,
    context,
    stack: error.stack,
  });

  // In production, send to monitoring service
  // Example: Sentry.captureException(error, { contexts: { dashboard: context } });
}
