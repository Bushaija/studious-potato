"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Database, 
  Loader2,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
  Info,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { 
  UploadStage,
  UploadProgressProps,
  StageInfo
} from '../types';
import { STAGE_ORDER } from '../types';

const STAGE_INFO: Record<UploadStage, StageInfo> = {
  uploading: {
    label: 'Uploading',
    description: 'Transferring file to server...',
    icon: Upload,
    color: 'text-blue-600'
  },
  parsing: {
    label: 'Parsing',
    description: 'Reading and processing file content...',
    icon: FileText,
    color: 'text-orange-600'
  },
  validating: {
    label: 'Validating',
    description: 'Checking data format and business rules...',
    icon: CheckCircle,
    color: 'text-purple-600'
  },
  saving: {
    label: 'Saving',
    description: 'Storing planning data in database...',
    icon: Database,
    color: 'text-green-600'
  },
  completed: {
    label: 'Completed',
    description: 'Upload completed successfully',
    icon: CheckCircle,
    color: 'text-green-600'
  }
};

// STAGE_ORDER is now imported from types

interface ProgressState {
  startTime: number;
  stageStartTimes: Record<UploadStage, number>;
  estimatedTimeRemaining: number;
  uploadSpeed: number;
  connectionStatus: 'online' | 'offline' | 'slow';
  showDetails: boolean;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  isUploading,
  progress,
  stage,
  fileName,
  className,
  onCancel
}) => {
  const [progressState, setProgressState] = useState<ProgressState>({
    startTime: Date.now(),
    stageStartTimes: {} as Record<UploadStage, number>,
    estimatedTimeRemaining: 0,
    uploadSpeed: 0,
    connectionStatus: 'online',
    showDetails: false
  });

  const currentStageInfo = STAGE_INFO[stage];
  const currentStageIndex = STAGE_ORDER.indexOf(stage);

  // Track stage changes and calculate timing
  useEffect(() => {
    if (isUploading && !progressState.stageStartTimes[stage]) {
      setProgressState(prev => ({
        ...prev,
        stageStartTimes: {
          ...prev.stageStartTimes,
          [stage]: Date.now()
        }
      }));
    }
  }, [stage, isUploading, progressState.stageStartTimes]);

  // Monitor connection status
  useEffect(() => {
    const updateConnectionStatus = () => {
      if (!navigator.onLine) {
        setProgressState(prev => ({ ...prev, connectionStatus: 'offline' }));
      } else {
        // Check connection speed (simplified)
        const connection = (navigator as any).connection;
        if (connection) {
          const effectiveType = connection.effectiveType;
          if (effectiveType === 'slow-2g' || effectiveType === '2g') {
            setProgressState(prev => ({ ...prev, connectionStatus: 'slow' }));
          } else {
            setProgressState(prev => ({ ...prev, connectionStatus: 'online' }));
          }
        }
      }
    };

    updateConnectionStatus();
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);

    return () => {
      window.removeEventListener('online', updateConnectionStatus);
      window.removeEventListener('offline', updateConnectionStatus);
    };
  }, []);

  // Calculate estimated time remaining
  useEffect(() => {
    if (isUploading && progress > 0) {
      const elapsed = Date.now() - progressState.startTime;
      const rate = progress / elapsed;
      const remaining = (100 - progress) / rate;
      
      setProgressState(prev => ({
        ...prev,
        estimatedTimeRemaining: remaining,
        uploadSpeed: rate * 1000 // per second
      }));
    }
  }, [progress, isUploading, progressState.startTime]);

  const getStageStatus = (stageIndex: number): 'completed' | 'current' | 'pending' => {
    if (stageIndex < currentStageIndex) return 'completed';
    if (stageIndex === currentStageIndex) return 'current';
    return 'pending';
  };

  const formatFileName = (name: string) => {
    if (name.length <= 30) return name;
    const extension = name.split('.').pop();
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
    return `${nameWithoutExt.substring(0, 20)}...${extension}`;
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return 'Less than a second';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getConnectionIcon = () => {
    switch (progressState.connectionStatus) {
      case 'offline':
        return WifiOff;
      case 'slow':
        return AlertTriangle;
      default:
        return Wifi;
    }
  };

  const getConnectionColor = () => {
    switch (progressState.connectionStatus) {
      case 'offline':
        return 'text-red-600';
      case 'slow':
        return 'text-yellow-600';
      default:
        return 'text-green-600';
    }
  };

  if (!isUploading && stage !== 'completed') {
    return null;
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <currentStageInfo.icon className={cn("h-5 w-5", currentStageInfo.color)} />
          <span>Upload Progress</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status Alert */}
        {progressState.connectionStatus !== 'online' && (
          <Alert variant={progressState.connectionStatus === 'offline' ? 'destructive' : 'default'}>
            {React.createElement(getConnectionIcon(), { className: "h-4 w-4" })}
            <AlertDescription>
              {progressState.connectionStatus === 'offline' ? (
                <span>Connection lost. Upload will resume when connection is restored.</span>
              ) : (
                <span>Slow connection detected. Upload may take longer than usual.</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* File Info and Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm">
            <FileText className="h-4 w-4 text-gray-500" />
            <span className="font-medium text-gray-700">File:</span>
            <span className="text-gray-600" title={fileName}>
              {formatFileName(fileName)}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {React.createElement(getConnectionIcon(), { 
              className: cn("h-4 w-4", getConnectionColor()) 
            })}
            
            {onCancel && isUploading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar with Enhanced Info */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              {currentStageInfo.label}
            </span>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>{Math.round(progress)}%</span>
              {progressState.estimatedTimeRemaining > 0 && isUploading && (
                <span className="text-xs">
                  • {formatTime(progressState.estimatedTimeRemaining)} remaining
                </span>
              )}
            </div>
          </div>
          
          <Progress 
            value={progress} 
            className="h-3"
          />
          
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>{currentStageInfo.description}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setProgressState(prev => ({ ...prev, showDetails: !prev.showDetails }))}
              className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700"
            >
              {progressState.showDetails ? 'Hide Details' : 'Show Details'}
            </Button>
          </div>
        </div>

        {/* Detailed Progress Information */}
        {progressState.showDetails && (
          <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-700">Elapsed Time:</span>
                <span className="ml-2 text-gray-600">
                  {formatTime(Date.now() - progressState.startTime)}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Connection:</span>
                <span className={cn("ml-2 capitalize", getConnectionColor())}>
                  {progressState.connectionStatus}
                </span>
              </div>
            </div>
            
            {stage !== 'completed' && (
              <div>
                <span className="font-medium text-gray-700">Current Stage:</span>
                <span className="ml-2 text-gray-600">
                  {currentStageInfo.label} - {currentStageInfo.description}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Stage Indicators */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Processing Stages</h4>
          <div className="space-y-2">
            {STAGE_ORDER.slice(0, -1).map((stageName, index) => {
              const stageInfo = STAGE_INFO[stageName];
              const status = getStageStatus(index);
              const Icon = stageInfo.icon;
              
              return (
                <div
                  key={stageName}
                  className={cn(
                    "flex items-center space-x-3 p-2 rounded-lg transition-colors",
                    status === 'completed' && "bg-green-50",
                    status === 'current' && "bg-blue-50",
                    status === 'pending' && "bg-gray-50"
                  )}
                >
                  <div className="flex-shrink-0">
                    {status === 'completed' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : status === 'current' ? (
                      <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      status === 'completed' && "text-green-700",
                      status === 'current' && "text-blue-700",
                      status === 'pending' && "text-gray-500"
                    )}>
                      {stageInfo.label}
                    </p>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <Badge 
                      variant={
                        status === 'completed' ? 'default' : 
                        status === 'current' ? 'secondary' : 
                        'outline'
                      }
                      className={cn(
                        "text-xs",
                        status === 'completed' && "bg-green-100 text-green-700 border-green-200",
                        status === 'current' && "bg-blue-100 text-blue-700 border-blue-200"
                      )}
                    >
                      {status === 'completed' ? 'Done' : 
                       status === 'current' ? 'Processing' : 
                       'Pending'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Completion Message */}
        {stage === 'completed' && (
          <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-700">
                Upload completed successfully!
              </p>
              <p className="text-xs text-green-600">
                Your planning data has been processed and saved.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};