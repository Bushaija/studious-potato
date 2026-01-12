"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNetworkUploadError, useUploadErrorWithRetry } from '@/hooks/use-upload-error';
import { isRetryableUploadError, shouldRetryUpload, getRetryMessage, type UploadErrorInfo } from '@/lib/upload-errors';
import { validateBeforeUpload, canProceedWithUpload, getValidationSummary } from '@/lib/upload-validation';

import { FileUploadArea } from './file-upload-area';
import { TemplateDownload } from './template-download';
import { UploadProgress } from './upload-progress';
import { ValidationResults } from './validation-results';
import { useUploadPlanning } from '@/hooks/queries/planning/use-upload-planning';
import type { 
  UploadState,
  UploadStage,
  UploadResults,
  FileUploadTabProps
} from '../types';

const INITIAL_UPLOAD_STATE: UploadState = {
  selectedFile: null,
  isUploading: false,
  uploadProgress: 0,
  stage: 'uploading',
  validationResults: null,
  error: null,
};

export const FileUploadTab: React.FC<FileUploadTabProps> = ({
  projectId,
  facilityId,
  reportingPeriodId,
  projectType,
  facilityType,
  onUploadSuccess,
  className
}) => {
  const [uploadState, setUploadState] = useState<UploadState>(INITIAL_UPLOAD_STATE);
  const [uploadError, setUploadError] = useState<UploadErrorInfo | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<UploadErrorInfo[]>([]);
  const [isRetryInProgress, setIsRetryInProgress] = useState(false);
  
  const uploadMutation = useUploadPlanning();
  
  // Enhanced error handler with retry capability
  const errorHandler = useUploadErrorWithRetry(() => {
    handleRetry();
  }, 3); // Max 3 retries

  const handleFileSelect = useCallback((file: File) => {
    setUploadState(prev => ({
      ...prev,
      selectedFile: file,
      error: null,
      validationResults: null
    }));
    setUploadError(null);
    errorHandler.resetRetry();
    setValidationWarnings([]);
    setIsRetryInProgress(false);
  }, [errorHandler]);

  const handleClearFile = useCallback(() => {
    setUploadState(INITIAL_UPLOAD_STATE);
    setUploadError(null);
    errorHandler.resetRetry();
    setValidationWarnings([]);
    setIsRetryInProgress(false);
  }, [errorHandler]);

  const handleUploadStart = useCallback(async () => {
    if (!uploadState.selectedFile) return;

    setIsValidating(true);
    setUploadError(null);
    setValidationWarnings([]);

    try {
      // Comprehensive pre-upload validation
      const validation = await validateBeforeUpload(uploadState.selectedFile, {
        projectId,
        facilityId,
        reportingPeriodId,
        projectType,
        facilityType
      });

      if (!canProceedWithUpload(validation)) {
        // Show validation errors
        const primaryError = validation.errors[0];
        setUploadError(primaryError);
        setIsValidating(false);
        return;
      }

      // Set warnings if any
      if (validation.warnings.length > 0) {
        setValidationWarnings(validation.warnings);
      }

      setIsValidating(false);
      setUploadState(prev => ({
        ...prev,
        isUploading: true,
        uploadProgress: 0,
        stage: 'uploading',
        error: null,
        validationResults: null
      }));

      // Start the upload mutation
      uploadMutation.mutate({
        file: uploadState.selectedFile,
        params: {
          projectId,
          facilityId,
          reportingPeriodId,
          projectType,
          facilityType
        }
      });
    } catch (error) {
      setIsValidating(false);
      const errorInfo = errorHandler.handleError(error);
      setUploadError(errorInfo);
    }
  }, [uploadState.selectedFile, uploadMutation, projectId, facilityId, reportingPeriodId, projectType, facilityType, errorHandler]);

  // Enhanced upload progress tracking
  useEffect(() => {
    if (uploadMutation.isPending) {
      let progressInterval: NodeJS.Timeout;
      let currentProgress = 0;
      
      // More realistic progress simulation with variable speeds per stage
      const updateProgress = () => {
        setUploadState(prev => {
          const { uploadProgress, stage } = prev;
          let newProgress = uploadProgress;
          let newStage = stage;
          
          // Stage-specific progress increments (more realistic timing)
          if (uploadProgress < 20) {
            // Uploading stage - faster initial progress
            newProgress = Math.min(uploadProgress + Math.random() * 8 + 2, 20);
            newStage = 'uploading';
          } else if (uploadProgress < 45) {
            // Parsing stage - moderate speed
            newProgress = Math.min(uploadProgress + Math.random() * 4 + 1, 45);
            newStage = 'parsing';
          } else if (uploadProgress < 80) {
            // Validating stage - slower (most complex)
            newProgress = Math.min(uploadProgress + Math.random() * 2 + 0.5, 80);
            newStage = 'validating';
          } else if (uploadProgress < 95) {
            // Saving stage - moderate speed
            newProgress = Math.min(uploadProgress + Math.random() * 3 + 1, 95);
            newStage = 'saving';
          } else {
            // Final stage - slow completion
            newProgress = Math.min(uploadProgress + 0.5, 99);
          }
          
          return { ...prev, uploadProgress: newProgress, stage: newStage };
        });
      };

      // Variable interval timing for more realistic progress
      const scheduleNextUpdate = () => {
        const delay = Math.random() * 300 + 100; // 100-400ms intervals
        progressInterval = setTimeout(() => {
          updateProgress();
          if (uploadMutation.isPending) {
            scheduleNextUpdate();
          }
        }, delay);
      };

      scheduleNextUpdate();

      return () => {
        if (progressInterval) {
          clearTimeout(progressInterval);
        }
      };
    }
  }, [uploadMutation.isPending]);

  useEffect(() => {
    if (uploadMutation.isSuccess) {
      const result = uploadMutation.data;
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        uploadProgress: 100,
        stage: 'completed',
        validationResults: {
          success: result.success,
          planningId: result.planningId,
          stats: result.stats
        }
      }));
    }
  }, [uploadMutation.isSuccess, uploadMutation.data]);

  useEffect(() => {
    if (uploadMutation.isError) {
      const errorInfo = errorHandler.handleError(uploadMutation.error);
      setUploadError(errorInfo);
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        error: errorInfo.title
      }));

      // Check if we should auto-retry
      if (errorHandler.canRetry(errorInfo) && !isRetryInProgress) {
        setIsRetryInProgress(true);
        errorHandler.handleRetry(errorInfo).then((didRetry) => {
          if (!didRetry) {
            setIsRetryInProgress(false);
          }
        });
      }
    }
  }, [uploadMutation.isError, uploadMutation.error, errorHandler, isRetryInProgress]);

  const handleRetry = useCallback(() => {
    if (uploadState.selectedFile) {
      setUploadError(null);
      setIsRetryInProgress(false);
      handleUploadStart();
    } else {
      setUploadState(INITIAL_UPLOAD_STATE);
      setUploadError(null);
      errorHandler.resetRetry();
      setIsRetryInProgress(false);
    }
  }, [uploadState.selectedFile, handleUploadStart, errorHandler]);

  const handleViewDetails = useCallback((planningId: number) => {
    onUploadSuccess(planningId);
  }, [onUploadSuccess]);

  const handleBackToList = useCallback(() => {
    // Navigate back to planning list - this will be handled by parent component
    window.history.back();
  }, []);

  const handleCancelUpload = useCallback(() => {
    if (uploadMutation.isPending) {
      // Reset upload mutation (this will cancel the request if possible)
      uploadMutation.reset();
      
      // Reset upload state
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        uploadProgress: 0,
        stage: 'uploading',
        error: 'Upload cancelled by user'
      }));
      
      setUploadError({
        title: "Upload cancelled",
        description: "The upload was cancelled. You can try uploading again or choose a different file.",
        canRetry: true,
        severity: 'info',
        category: 'validation'
      });
    }
  }, [uploadMutation]);

  const { selectedFile, isUploading, uploadProgress, stage, validationResults, error } = uploadState;

  const getErrorIcon = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return AlertCircle;
      case 'warning':
        return AlertTriangle;
      case 'info':
        return Info;
      default:
        return AlertCircle;
    }
  };

  const getErrorVariant = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'default';
      default:
        return 'destructive';
    }
  };

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Template Download Section */}
        <div>
          <TemplateDownload
            projectType={projectType}
            facilityType={facilityType}
            disabled={isUploading}
          />
        </div>

        <Separator />

        {/* File Upload Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Upload Your File
          </h3>
          
          {uploadError && (
            <Alert variant={getErrorVariant(uploadError.severity)} className="mb-4">
              {React.createElement(getErrorIcon(uploadError.severity), { className: "h-4 w-4" })}
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">{uploadError.title}</p>
                  <p className="text-sm">{uploadError.description}</p>
                  
                  {/* Retry Information */}
                  {errorHandler.retryCount > 0 && (
                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      <p>Retry attempt {errorHandler.retryCount} of 3</p>
                      {isRetryInProgress && (
                        <p className="text-blue-600 mt-1">
                          {errorHandler.getRetryMessage(uploadError)}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Manual Retry Button */}
                  {uploadError.canRetry && errorHandler.canRetry(uploadError) && !isRetryInProgress && (
                    <div className="flex items-center space-x-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetry}
                        disabled={isUploading || errorHandler.isRetrying}
                        className="flex items-center space-x-1"
                      >
                        <RefreshCw className={cn(
                          "h-3 w-3", 
                          (isUploading || errorHandler.isRetrying) && "animate-spin"
                        )} />
                        <span>
                          {errorHandler.retryCount > 0 ? 'Retry Again' : 'Retry Upload'}
                        </span>
                      </Button>
                      
                      <span className="text-xs text-gray-500">
                        {3 - errorHandler.retryCount} attempts remaining
                      </span>
                    </div>
                  )}

                  {/* Max retries reached */}
                  {uploadError.canRetry && !errorHandler.canRetry(uploadError) && errorHandler.retryCount >= 3 && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-3">
                      <p className="font-medium">Maximum retry attempts reached</p>
                      <p>Please check your connection and try uploading a different file, or contact support if the issue persists.</p>
                    </div>
                  )}
                  
                  {/* Action button for non-retryable errors */}
                  {uploadError.action && (!uploadError.canRetry || !errorHandler.canRetry(uploadError)) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={uploadError.action.onClick}
                      className="mt-3"
                    >
                      {uploadError.action.label}
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <FileUploadArea
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            onClearFile={handleClearFile}
            disabled={isUploading}
            isProcessing={isUploading || isValidating}
            showValidationFeedback={true}
          />

          {/* Validation Warnings */}
          {validationWarnings.length > 0 && (
            <div className="mt-4 space-y-2">
              {validationWarnings.map((warning, index) => (
                <Alert key={index} variant="default">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">{warning.title}</p>
                      <p className="text-sm">{warning.description}</p>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Upload Button */}
          {selectedFile && !isUploading && !validationResults && (
            <div className="mt-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Ready to upload</p>
                      <p className="text-sm text-gray-600">
                        File: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                      {validationWarnings.length > 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          {validationWarnings.length} warning{validationWarnings.length > 1 ? 's' : ''} - upload can proceed
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={handleUploadStart}
                      disabled={isValidating}
                      className="flex items-center space-x-2"
                    >
                      {isValidating ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Validating...</span>
                        </>
                      ) : (
                        <>
                          <span>Start Upload</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Upload Progress Section */}
        {isUploading && selectedFile && (
          <>
            <Separator />
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Processing
              </h3>
              <UploadProgress
                isUploading={isUploading}
                progress={uploadProgress}
                stage={stage}
                fileName={selectedFile.name}
                onCancel={handleCancelUpload}
                showDetailedProgress={true}
              />
            </div>
          </>
        )}

        {/* Validation Results Section */}
        {validationResults && (
          <>
            <Separator />
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Upload Results
              </h3>
              <ValidationResults
                results={validationResults}
                onRetry={handleRetry}
                onViewDetails={handleViewDetails}
                onBackToList={handleBackToList}
              />
            </div>
          </>
        )}

        {/* Instructions */}
        {/* {!selectedFile && !isUploading && !validationResults && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h4 className="font-medium text-blue-900 mb-2">Upload Instructions</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>1. Download the template file for your facility and program type</li>
                <li>2. Fill in your planning data using the template format</li>
                <li>3. Save the file and upload it using the file upload area above</li>
                <li>4. Review the validation results and address any issues</li>
              </ul>
            </CardContent>
          </Card>
        )} */}
      </div>
    </div>
  );
};