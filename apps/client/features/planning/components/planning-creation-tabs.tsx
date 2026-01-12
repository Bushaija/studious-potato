"use client";

import React, { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, FileUp, Edit3, Save } from 'lucide-react';

import { FileUploadTab } from './file-upload-tab';
import { ManualEntryTab } from './manual-entry-tab';
import { UploadErrorBoundary } from './upload-error-boundary';
import type { 
  PlanningCreationContextValue,
  TabState,
  PlanningCreationTabsProps,
  TabMode
} from '../types';

const PlanningCreationContext = createContext<PlanningCreationContextValue | null>(null);

export const usePlanningCreationContext = () => {
  const context = useContext(PlanningCreationContext);
  if (!context) {
    throw new Error('usePlanningCreationContext must be used within PlanningCreationTabs');
  }
  return context;
};

export const PlanningCreationTabs: React.FC<PlanningCreationTabsProps> = ({
  projectId,
  facilityId,
  reportingPeriodId,
  facilityName,
  program,
  facilityType,
  projectType,
  onSuccess,
  onCancel,
  defaultTab = 'manual'
}) => {
  const [tabState, setTabState] = useState<TabState>({
    activeTab: defaultTab,
    hasUnsavedChanges: false,
    pendingTabSwitch: null,
    showUnsavedChangesDialog: false
  });

  // Save tab state to session storage for persistence
  useEffect(() => {
    const storageKey = `planning-tab-state-${projectId}-${facilityId}`;
    sessionStorage.setItem(storageKey, JSON.stringify({
      activeTab: tabState.activeTab,
      timestamp: Date.now()
    }));
  }, [tabState.activeTab, projectId, facilityId]);

  // Load tab state from session storage on mount
  useEffect(() => {
    const storageKey = `planning-tab-state-${projectId}-${facilityId}`;
    const savedState = sessionStorage.getItem(storageKey);
    
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        // Only restore if saved within the last hour
        if (Date.now() - parsed.timestamp < 3600000) {
          setTabState(prev => ({
            ...prev,
            activeTab: parsed.activeTab || defaultTab
          }));
        }
      } catch (error) {
        console.warn('Failed to parse saved tab state:', error);
      }
    }
  }, [projectId, facilityId, defaultTab]);

  // Context value for child components
  const contextValue: PlanningCreationContextValue = {
    projectId,
    facilityId,
    reportingPeriodId,
    facilityName,
    program,
    facilityType,
    projectType
  };

  // Handle tab switching with unsaved changes detection
  const handleTabChange = useCallback((value: string) => {
    const newTab = value as TabMode;
    
    // If switching away from manual tab and there are unsaved changes
    if (tabState.hasUnsavedChanges && tabState.activeTab === 'manual' && newTab !== 'manual') {
      setTabState(prev => ({
        ...prev,
        pendingTabSwitch: newTab,
        showUnsavedChangesDialog: true
      }));
      return;
    }

    // No unsaved changes, switch immediately
    setTabState(prev => ({
      ...prev,
      activeTab: newTab,
      hasUnsavedChanges: false,
      pendingTabSwitch: null,
      showUnsavedChangesDialog: false
    }));
  }, [tabState.hasUnsavedChanges, tabState.activeTab]);

  // Handle confirmation to switch tabs despite unsaved changes
  const handleConfirmTabSwitch = useCallback(() => {
    if (tabState.pendingTabSwitch) {
      setTabState(prev => ({
        ...prev,
        activeTab: prev.pendingTabSwitch!,
        hasUnsavedChanges: false,
        pendingTabSwitch: null,
        showUnsavedChangesDialog: false
      }));
    }
  }, [tabState.pendingTabSwitch]);

  // Handle cancellation of tab switch
  const handleCancelTabSwitch = useCallback(() => {
    setTabState(prev => ({
      ...prev,
      pendingTabSwitch: null,
      showUnsavedChangesDialog: false
    }));
  }, []);

  // Handle saving draft before tab switch
  const handleSaveAndSwitch = useCallback(async () => {
    try {
      // For now, we'll just simulate saving and proceed
      // In a full implementation, this would trigger the form's save draft method
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate save
      
      // Clear unsaved changes and proceed with tab switch
      setTabState(prev => ({
        ...prev,
        hasUnsavedChanges: false
      }));
      
      handleConfirmTabSwitch();
    } catch (error) {
      console.error('Failed to save draft:', error);
      // Still proceed with tab switch on error
      handleConfirmTabSwitch();
    }
  }, [handleConfirmTabSwitch]);

  // Handle unsaved changes detection from manual entry
  const handleUnsavedChanges = useCallback((hasChanges: boolean) => {
    setTabState(prev => ({
      ...prev,
      hasUnsavedChanges: hasChanges
    }));
  }, []);

  // Handle upload success
  const handleUploadSuccess = useCallback((planningId: number) => {
    // Call parent success handler
    onSuccess?.({ planningId, mode: 'upload' });
  }, [onSuccess]);

  // Handle manual entry success
  const handleManualSuccess = useCallback((data: any) => {
    // Call parent success handler
    onSuccess?.({ ...data, mode: 'manual' });
  }, [onSuccess]);

  return (
    <PlanningCreationContext.Provider value={contextValue}>
      <div className="space-y-6 mt-2">
        {/* Unsaved Changes Warning
        {tabState.hasUnsavedChanges && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>You have unsaved changes in the manual entry form.</span>
              <Button variant="outline" size="sm" onClick={handleSaveAndSwitch}>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
            </AlertDescription>
          </Alert>
        )} */}

        {/* Unsaved Changes Confirmation Dialog */}
        {/* <AlertDialog open={tabState.showUnsavedChangesDialog} onOpenChange={handleCancelTabSwitch}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes in the manual entry form. What would you like to do?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex gap-2">
              <AlertDialogCancel onClick={handleCancelTabSwitch}>
                Stay on Current Tab
              </AlertDialogCancel>
              <Button variant="outline" onClick={handleSaveAndSwitch}>
                <Save className="h-4 w-4 mr-2" />
                Save & Switch
              </Button>
              <AlertDialogAction onClick={handleConfirmTabSwitch} className="bg-red-600 hover:bg-red-700">
                Discard Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog> */}

        {/* Tab Interface */}
        <Tabs value={tabState.activeTab} onValueChange={handleTabChange}>
          <TabsList className="flex w-full max-w-sm gap-6">
            <TabsTrigger value="manual" className=''>
              <Edit3 className="h-4 w-4" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="upload">
              <FileUp className="h-4 w-4" />
              Upload
            </TabsTrigger>
          </TabsList>

          {/* Manual Entry Tab Content */}
          <TabsContent value="manual">
            <ManualEntryTab
              onUnsavedChanges={handleUnsavedChanges}
              onSuccess={handleManualSuccess}
              onCancel={onCancel}
            />
          </TabsContent>

          {/* File Upload Tab Content */}
          <TabsContent value="upload" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">File Upload</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Upload Excel or CSV files containing your planning data
                  </p>
                </div>
                
                <UploadErrorBoundary>
                  <FileUploadTab
                    projectId={projectId}
                    facilityId={facilityId}
                    reportingPeriodId={reportingPeriodId}
                    projectType={program}
                    facilityType={facilityType}
                    onUploadSuccess={handleUploadSuccess}
                  />
                </UploadErrorBoundary>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PlanningCreationContext.Provider>
  );
};