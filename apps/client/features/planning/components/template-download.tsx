"use client";

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileSpreadsheet, AlertCircle, Loader2 } from 'lucide-react';
import { useDownloadTemplate } from '@/hooks/queries/planning/use-download-template';
import type { 
  TemplateDownloadProps,
  FileFormat
} from '../types';

export const TemplateDownload: React.FC<TemplateDownloadProps> = ({
  projectType,
  facilityType,
  disabled = false,
  className
}) => {
  const [selectedFormat, setSelectedFormat] = useState<FileFormat>('xlsx');
  const downloadMutation = useDownloadTemplate();

  const handleDownload = useCallback(() => {
    const filename = `planning_template_${projectType}_${facilityType}.${selectedFormat}`;
    downloadMutation.mutate({
      projectType,
      facilityType,
      format: selectedFormat,
      filename
    });
  }, [downloadMutation, projectType, facilityType, selectedFormat]);

  const formatDisplayName = (format: string) => {
    return format === 'xlsx' ? 'Excel (.xlsx)' : 'CSV (.csv)';
  };

  return (
    <section className={`${className} p-4`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileSpreadsheet className="h-5 w-5" />
          <span>Download Template</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <p className="text-sm text-gray-600 m-4">
            Download a template file with the correct format and activities for your facility type and program.
          </p>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Template Format
              </label>
              <Select
                value={selectedFormat}
                onValueChange={(value: FileFormat) => setSelectedFormat(value)}
                disabled={disabled || downloadMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p><strong>Program:</strong> {projectType}</p>
              <p><strong>Facility Type:</strong> {facilityType === 'health_center' ? 'Health Center' : 'Hospital'}</p>
            </div>
          </div>
        </div>

        {downloadMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {downloadMutation.error?.message || 'Failed to download template'}
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleDownload}
          disabled={disabled || downloadMutation.isPending}
          className="w-full"
          variant="outline"
        >
          {downloadMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating {formatDisplayName(selectedFormat)}...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download {formatDisplayName(selectedFormat)} Template
            </>
          )}
        </Button>
      </CardContent>
    </section>
  );
};