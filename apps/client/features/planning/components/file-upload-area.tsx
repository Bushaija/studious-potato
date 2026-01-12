"use client";

import React, { useCallback, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, File, X, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFileValidationError } from '@/hooks/use-upload-error';
import { validateFile, formatFileSize, type UploadErrorInfo } from '@/lib/upload-errors';
import type { 
  FileValidation,
  FileUploadAreaProps
} from '../types';
import { 
  DEFAULT_ACCEPTED_FORMATS,
  DEFAULT_MAX_FILE_SIZE
} from '../types';

export const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  onFileSelect,
  acceptedFormats = DEFAULT_ACCEPTED_FORMATS,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  disabled = false,
  selectedFile,
  onClearFile,
  isProcessing = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationErrors, setValidationErrors] = useState<UploadErrorInfo[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorHandler = useFileValidationError();

  const handleFileSelection = useCallback(async (file: File) => {
    // Clear previous errors and show validation loading
    setValidationErrors([]);
    setIsValidating(true);
    
    try {
      // Add a small delay to show validation feedback
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Validate file using enhanced validation
      const validation = validateFile(file);
      
      if (validation.isValid) {
        onFileSelect(file);
      } else {
        // Set validation errors for display
        setValidationErrors(validation.errors);
        
        // Handle each error with the error handler (for logging, etc.)
        validation.errors.forEach(error => {
          errorHandler.getErrorInfo(error);
        });
      }
    } finally {
      setIsValidating(false);
    }
  }, [onFileSelect, errorHandler]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  }, [disabled, handleFileSelection]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  }, [handleFileSelection]);

  const handleBrowseClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const handleClearFile = useCallback(() => {
    setValidationErrors([]);
    setIsValidating(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClearFile?.();
  }, [onClearFile]);

  const isDisabled = disabled || isProcessing || isValidating;

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
    <div className="space-y-4">
      <Card 
        className={cn(
          "border-2 border-dashed transition-colors duration-200",
          isDragOver && !isDisabled && "border-blue-400 bg-blue-50",
          isDisabled && "opacity-50 cursor-not-allowed",
          !isDisabled && !isDragOver && "border-gray-300 hover:border-gray-400",
          validationErrors.length > 0 && "border-red-300 bg-red-50",
          isValidating && "border-blue-300 bg-blue-25"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-8">
          {isValidating ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">Validating file...</p>
                <p className="text-sm text-gray-500 mt-1">
                  Checking file format and size
                </p>
              </div>
            </div>
          ) : selectedFile ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <File className="h-8 w-8 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              
              {isProcessing && (
                <div className="flex items-center justify-center space-x-2 text-sm text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing file...</span>
                </div>
              )}
              
              <div className="flex justify-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBrowseClick}
                  disabled={isDisabled}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Different File
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFile}
                  disabled={isDisabled}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Upload className={cn(
                  "h-12 w-12",
                  isDragOver && !disabled ? "text-blue-600" : "text-gray-400"
                )} />
              </div>
              
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {isDragOver && !disabled ? "Drop your file here" : "Upload planning data file"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Drag and drop your file here, or click to browse
                </p>
              </div>
              
              <Button
                variant="outline"
                onClick={handleBrowseClick}
                disabled={isDisabled}
                className="mt-4"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Browse Files
                  </>
                )}
              </Button>
              
              <div className="text-xs text-gray-500 space-y-1">
                <p>Supported formats: {acceptedFormats.join(', ')}</p>
                <p>Maximum file size: {formatFileSize(maxFileSize)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {validationErrors.length > 0 && (
        <div className="space-y-2">
          {validationErrors.map((error, index) => {
            const ErrorIcon = getErrorIcon(error.severity);
            return (
              <Alert key={index} variant={getErrorVariant(error.severity)}>
                <ErrorIcon className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">{error.title}</p>
                    <p className="text-sm">{error.description}</p>
                    {error.action && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={error.action.onClick}
                      >
                        {error.action.label}
                      </Button>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
};