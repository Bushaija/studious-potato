"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  RefreshCw,
  ChevronDown
} from 'lucide-react';

import {
  usePlanningDetail,
  usePlanningActivities
} from '@/hooks/queries';

import { 
  formatCurrency,
  exportPlanningData,
} from '@/lib/planning';

import { ReadonlyCategorySection } from './readonly-category-section';
import { PlanningFormProvider } from './planning-form-context';

interface ReadonlyPlanningFormProps {
  planningId: string;
  onBack?: () => void;
  showHeader?: boolean;
}

export const ReadonlyPlanningForm: React.FC<ReadonlyPlanningFormProps> = ({
  planningId,
  onBack,
  showHeader = true
}) => {
  const router = useRouter();
  
  // State for UI
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});

  // Load existing data
  const { data: existingData, isLoading, error } = usePlanningDetail(planningId);

  // Extract project type and facility type from existing data
  const projectType = useMemo(() => {
    if (existingData) {
      return existingData.metadata?.projectType || existingData.schema?.projectType || 'HIV';
    }
    return 'HIV';
  }, [existingData]);

  const facilityType = useMemo(() => {
    if (existingData) {
      return existingData.metadata?.facilityType || existingData.schema?.facilityType || 'hospital';
    }
    return 'hospital';
  }, [existingData]);

  const facilityName = useMemo(() => {
    return existingData?.facility?.name || '';
  }, [existingData]);

  // Fetch activities with category information
  const { data: activitiesData, isLoading: isLoadingActivities } = usePlanningActivities({
    projectType: projectType as 'HIV' | 'Malaria' | 'TB',
    facilityType: facilityType as 'hospital' | 'health_center',
    enabled: !!projectType && !!facilityType
  });

  // Initialize form data from existing data
  const formData = useMemo(() => {
    if (existingData) {
      const activitiesData = existingData.formData?.activities || {};
      console.log('📊 Readonly form data:', activitiesData);
      return activitiesData;
    }
    return {};
  }, [existingData]);

  // Get activities from the API with category information
  const activities = useMemo(() => {
    if (activitiesData?.data) {
      return activitiesData.data;
    }
    return [];
  }, [activitiesData]);

  const formSchema = existingData?.schema;

  // Calculate individual activity calculations
  const calculations = useMemo(() => {
    const calc: Record<string, any> = {};
    
    if (activities && formData) {
      activities.forEach((activity: any) => {
        const activityData = formData[activity.id.toString()];
        if (activityData) {
          const unitCost = activityData.unit_cost || 0;
          const q1Count = activityData.q1_count || 0;
          const q2Count = activityData.q2_count || 0;
          const q3Count = activityData.q3_count || 0;
          const q4Count = activityData.q4_count || 0;
          
          const q1Amount = unitCost * q1Count;
          const q2Amount = unitCost * q2Count;
          const q3Amount = unitCost * q3Count;
          const q4Amount = unitCost * q4Count;
          const totalAmount = q1Amount + q2Amount + q3Amount + q4Amount;
          
          calc[activity.id.toString()] = {
            q1Amount,
            q2Amount,
            q3Amount,
            q4Amount,
            totalAmount
          };
        }
      });
    }
    
    return calc;
  }, [activities, formData]);

  // Transform activities into categories
  const categories = useMemo(() => {
    if (!activities || activities.length === 0) return [];
    
    // Group activities by category
    const categoryMap = new Map();
    
    activities.forEach((activity: any) => {
      const categoryId = activity.categoryId;
      const categoryName = activity.categoryName;
      const categoryCode = activity.categoryCode;
      const categoryDisplayOrder = activity.categoryDisplayOrder;
      
      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          id: categoryId,
          name: categoryName,
          code: categoryCode,
          displayOrder: categoryDisplayOrder,
          activities: []
        });
      }
      
      categoryMap.get(categoryId).activities.push(activity);
    });
    
    // Convert map to array and sort by display order
    const categoriesArray = Array.from(categoryMap.values())
      .sort((a, b) => a.displayOrder - b.displayOrder);
    
    // Sort activities within each category by display order
    categoriesArray.forEach(category => {
      category.activities.sort((a: any, b: any) => a.displayOrder - b.displayOrder);
    });
    
    console.log('📊 Categorized activities:', categoriesArray);
    return categoriesArray;
  }, [activities]);

  // Calculate grand totals
  const grandTotals = useMemo(() => {
    if (!categories) {
      return {
        q1Amount: 0,
        q2Amount: 0,
        q3Amount: 0,
        q4Amount: 0,
        totalAmount: 0
      };
    }

    const result = categories.reduce((totals, category) => {
      if (category?.activities) {
        category.activities.forEach(activity => {
          if (activity?.id) {
            const activityData = formData[activity.id.toString()];

            if (activityData) {
              const unitCost = activityData.unit_cost || 0;
              const q1Count = activityData.q1_count || 0;
              const q2Count = activityData.q2_count || 0;
              const q3Count = activityData.q3_count || 0;
              const q4Count = activityData.q4_count || 0;
              
              const q1Amount = unitCost * q1Count;
              const q2Amount = unitCost * q2Count;
              const q3Amount = unitCost * q3Count;
              const q4Amount = unitCost * q4Count;
              const totalAmount = q1Amount + q2Amount + q3Amount + q4Amount;
              
              totals.q1Amount += q1Amount;
              totals.q2Amount += q2Amount;
              totals.q3Amount += q3Amount;
              totals.q4Amount += q4Amount;
              totals.totalAmount += totalAmount;
            }
          }
        });
      }
      return totals;
    }, {
      q1Amount: 0,
      q2Amount: 0,
      q3Amount: 0,
      q4Amount: 0,
      totalAmount: 0
    });

    return result;
  }, [categories, formData]);

  // Toggle category expansion
  const toggleCategory = useCallback((categoryId: number) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  }, []);

  // Export data
  const handleExport = useCallback(() => {
    if (!activities || !formData) return;

    const exportData = [{
      id: parseInt(planningId),
      schemaId: formSchema?.id || 0,
      projectId: existingData?.projectId || 0,
      facilityId: existingData?.facilityId || 0,
      reportingPeriodId: existingData?.reportingPeriodId || 0,
      formData: { activities: formData },
      computedValues: calculations,
      createdAt: existingData?.createdAt || new Date().toISOString(),
      updatedAt: existingData?.updatedAt || new Date().toISOString()
    }];

    exportPlanningData(exportData as any, activities, {
      format: 'csv',
      includeCalculations: true,
      filename: `planning-details-${projectType}-${facilityType}-${Date.now()}`
    });
  }, [activities, formData, calculations, planningId, formSchema, existingData, projectType, facilityType]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    onBack?.();
  }, [onBack]);

  // Loading states
  if (isLoading || isLoadingActivities) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading planning details...</p>
        </CardContent>
      </Card>
    );
  }

  // Error states
  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{typeof error === 'string' ? error : 'An error occurred'}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!existingData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-8 w-8 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Planning data not found</p>
          <Button onClick={handleBack}>
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <PlanningFormProvider
      value={{
        formData: formData,
        calculations,
        handleFieldChange: () => {}, // No-op for readonly
        validationErrors: {},
        isCalculating: false,
        isValidating: false
      }}
    >
      <div>
        {/* Header */}
        {showHeader && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Planning Details
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Read Only
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">{projectType}</Badge>
                    <Badge variant="secondary">
                      {facilityType === 'health_center' ? 'Health Center' : 'Hospital'}
                    </Badge>
                    {facilityName && (
                      <Badge variant="outline">
                        {facilityName}
                      </Badge>
                    )}
                    {formSchema && (
                      <Badge variant="outline">
                        Schema: {formSchema.name} v{formSchema.version}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={!activities || !formData || Object.keys(formData).length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  {onBack && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBack}
                    >
                      Back
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Activities Table */}
        <Card className='p-0 mt-4'>
          <CardHeader className=''>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {formSchema?.schema?.title || 'Planning Activities'}
                <Badge variant="outline">{categories.length} categories</Badge>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={!activities || !formData || Object.keys(formData).length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left text-sm font-semibold text-gray-900 sticky left-0 bg-gray-50 border-r min-w-[300px]">
                      Activity Category
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-24">
                      Frequency
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-32">
                      Unit Cost ($)
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-24">
                      Q1 Count
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-24">
                      Q2 Count
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-24">
                      Q3 Count
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-24">
                      Q4 Count
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-32">
                      Q1 Amount
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-32">
                      Q2 Amount
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-32">
                      Q3 Amount
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-32">
                      Q4 Amount
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-36">
                      Total Budget
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 min-w-[200px]">
                      Comments
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(category => (
                    <ReadonlyCategorySection
                      key={category.id}
                      category={category}
                      isExpanded={expandedCategories[category.id]}
                      onToggle={() => toggleCategory(category.id)}
                    />
                  ))}
                  
                  {/* Grand Totals Row */}
                  <tr className="bg-gray-100 font-semibold">
                    <td className="px-4 py-3 text-left font-bold border-r">
                      <div className="flex items-center gap-2">
                        <ChevronDown className="h-4 w-4" />
                        <span>GRAND TOTALS</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">-</td>
                    <td className="px-4 py-3 text-center">-</td>
                    <td className="px-4 py-3 text-center">-</td>
                    <td className="px-4 py-3 text-center">-</td>
                    <td className="px-4 py-3 text-center">-</td>
                    <td className="px-4 py-3 text-center">-</td>
                    <td className="px-4 py-3 text-center font-bold text-green-600">
                      {formatCurrency(grandTotals.q1Amount)}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-green-600">
                      {formatCurrency(grandTotals.q2Amount)}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-green-600">
                      {formatCurrency(grandTotals.q3Amount)}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-green-600">
                      {formatCurrency(grandTotals.q4Amount)}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-blue-600">
                      {formatCurrency(grandTotals.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PlanningFormProvider>
  );
};
