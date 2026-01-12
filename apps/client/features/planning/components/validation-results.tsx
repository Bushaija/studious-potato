"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  ChevronDown, 
  ChevronRight,
  Eye,
  RotateCcw,
  ArrowLeft,
  TrendingUp,
  FileText,
  Users,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { 
  ValidationIssue,
  DataQuality,
  UploadStats,
  UploadResults,
  ValidationResultsProps
} from '../types';

export const ValidationResults: React.FC<ValidationResultsProps> = ({
  results,
  onRetry,
  onViewDetails,
  onBackToList,
  className
}) => {
  const [showWarnings, setShowWarnings] = useState(false);
  const [showErrors, setShowErrors] = useState(true);

  const { success, planningId, stats } = results;
  const { 
    rowsParsed, 
    validRows, 
    invalidRows, 
    activitiesProcessed, 
    totalBudget,
    warnings, 
    errors, 
    warningCount, 
    errorCount,
    dataQuality 
  } = stats;

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getQualityColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityLabel = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  const groupIssuesByCategory = (issues: ValidationIssue[]) => {
    return issues.reduce((groups, issue) => {
      const category = issue.category || 'General';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(issue);
      return groups;
    }, {} as Record<string, ValidationIssue[]>);
  };

  const IssuesList: React.FC<{ 
    issues: ValidationIssue[], 
    type: 'warning' | 'error',
    isOpen: boolean,
    onToggle: () => void 
  }> = ({ issues, type, isOpen, onToggle }) => {
    const groupedIssues = groupIssuesByCategory(issues);
    const Icon = type === 'error' ? XCircle : AlertTriangle;
    const colorClass = type === 'error' ? 'text-red-600' : 'text-yellow-600';

    if (issues.length === 0) return null;

    return (
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-3 h-auto">
            <div className="flex items-center space-x-2">
              <Icon className={cn("h-4 w-4", colorClass)} />
              <span className="font-medium">
                {issues.length} {type === 'error' ? 'Error' : 'Warning'}{issues.length !== 1 ? 's' : ''}
              </span>
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2">
          {Object.entries(groupedIssues).map(([category, categoryIssues]) => (
            <div key={category} className="ml-4 space-y-1">
              <h5 className="text-sm font-medium text-gray-700">{category}</h5>
              {categoryIssues.map((issue) => (
                <div
                  key={issue.id}
                  className={cn(
                    "p-2 rounded border-l-4 text-sm",
                    type === 'error' 
                      ? "bg-red-50 border-red-400 text-red-700"
                      : "bg-yellow-50 border-yellow-400 text-yellow-700"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <p className="flex-1">{issue.message}</p>
                    {issue.row && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Row {issue.row}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {success ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600" />
          )}
          <span>
            {success ? 'Upload Successful' : 'Upload Failed'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Success/Error Summary */}
        <Alert variant={success ? "default" : "destructive"}>
          <AlertDescription>
            {success ? (
              <span>
                Your planning data has been successfully uploaded and processed. 
                {warningCount > 0 && ` ${warningCount} warning${warningCount !== 1 ? 's' : ''} were found but did not prevent the upload.`}
              </span>
            ) : (
              <span>
                The upload failed due to validation errors. Please review the issues below and try again.
              </span>
            )}
          </AlertDescription>
        </Alert>

        {/* Processing Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <FileText className="h-6 w-6 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-700">{rowsParsed}</p>
            <p className="text-xs text-blue-600">Rows Parsed</p>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <Users className="h-6 w-6 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-700">{activitiesProcessed}</p>
            <p className="text-xs text-green-600">Activities</p>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <DollarSign className="h-6 w-6 text-purple-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-purple-700">{formatCurrency(totalBudget)}</p>
            <p className="text-xs text-purple-600">Total Budget</p>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <TrendingUp className="h-6 w-6 text-gray-600 mx-auto mb-1" />
            <p className={cn("text-2xl font-bold", getQualityColor(dataQuality.score))}>
              {Math.round(dataQuality.score)}%
            </p>
            <p className="text-xs text-gray-600">Data Quality</p>
          </div>
        </div>

        {/* Data Quality Breakdown */}
        {success && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Data Quality Assessment</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Overall Score</span>
                <div className="flex items-center space-x-2">
                  <span className={cn("font-medium", getQualityColor(dataQuality.score))}>
                    {getQualityLabel(dataQuality.score)}
                  </span>
                  <Badge variant="outline">
                    {Math.round(dataQuality.score)}%
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-gray-600">Completeness</p>
                  <p className="font-medium">{Math.round(dataQuality.completeness)}%</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600">Accuracy</p>
                  <p className="font-medium">{Math.round(dataQuality.accuracy)}%</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600">Consistency</p>
                  <p className="font-medium">{Math.round(dataQuality.consistency)}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Issues Section */}
        {(errorCount > 0 || warningCount > 0) && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Issues Found</h4>
            
            <div className="space-y-2">
              <IssuesList
                issues={errors}
                type="error"
                isOpen={showErrors}
                onToggle={() => setShowErrors(!showErrors)}
              />
              
              <IssuesList
                issues={warnings}
                type="warning"
                isOpen={showWarnings}
                onToggle={() => setShowWarnings(!showWarnings)}
              />
            </div>
          </div>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {success && planningId ? (
            <Button
              onClick={() => onViewDetails(planningId)}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Planning Details
            </Button>
          ) : (
            <Button
              onClick={onRetry}
              variant="outline"
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          
          <Button
            onClick={onBackToList}
            variant="ghost"
            className="flex-1"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Planning List
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};