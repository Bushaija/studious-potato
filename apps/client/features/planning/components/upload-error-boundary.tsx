"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home, FileText } from 'lucide-react';

interface UploadErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface UploadErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{
    error: Error;
    resetError: () => void;
  }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Error boundary specifically designed for upload functionality
 * Provides user-friendly error messages and recovery options
 */
export class UploadErrorBoundary extends React.Component<
  UploadErrorBoundaryProps,
  UploadErrorBoundaryState
> {
  constructor(props: UploadErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): UploadErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // Log error for debugging
    console.error('Upload Error Boundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error!}
            resetError={this.resetError}
          />
        );
      }

      // Default error UI
      return (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Upload Error</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">
                    Something went wrong with the file upload functionality.
                  </p>
                  <p className="text-sm">
                    This is likely a temporary issue. Please try refreshing the page or contact support if the problem persists.
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium text-sm">Development Error Details:</p>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                      {this.state.error.message}
                      {this.state.errorInfo?.componentStack && (
                        <>
                          {'\n\nComponent Stack:'}
                          {this.state.errorInfo.componentStack}
                        </>
                      )}
                    </pre>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center space-x-3">
              <Button onClick={this.resetError} className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4" />
                <span>Try Again</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh Page</span>
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => window.history.back()}
                className="flex items-center space-x-2"
              >
                <Home className="h-4 w-4" />
                <span>Go Back</span>
              </Button>
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <p>If this error continues to occur, please:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Check your internet connection</li>
                <li>Try using a different browser</li>
                <li>Clear your browser cache and cookies</li>
                <li>Contact support with the error details above</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook version of the error boundary for functional components
 */
export function useUploadErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return {
    captureError,
    resetError,
    hasError: !!error,
  };
}

/**
 * Simple error fallback component for upload errors
 */
export const SimpleUploadErrorFallback: React.FC<{
  error: Error;
  resetError: () => void;
}> = ({ error, resetError }) => (
  <div className="text-center py-8 space-y-4">
    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
    <div>
      <h3 className="text-lg font-medium text-gray-900">Upload Error</h3>
      <p className="text-sm text-gray-600 mt-1">
        {error.message || 'Something went wrong with the file upload.'}
      </p>
    </div>
    <Button onClick={resetError} size="sm">
      Try Again
    </Button>
  </div>
);