"use client"


import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useForm, FormProvider } from "react-hook-form"
import { toast, Toaster } from "sonner" // Toaster might be better in a layout component

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  FinancialRow,
  generateEmptyFinancialTemplate,
  calculateHierarchicalTotals,
  FinancialReport,
  normalizeFinancialData,
} from "@/features/execution/schemas/execution-form-schema"
import { NumericInputCell } from "@/components/share/numeric-input-cell"
import { FinancialTableProps, FinancialTableDataPayload } from "@/types"
import { generateQuarterLabels, getCurrentFiscalYear } from "@/features/execution/utils"
import { toTitleCase } from "@/components/reports/report-header"
import { useRouter } from "next/navigation"
import { usePlanningTotals } from "@/features/execution/hooks/use-planning-totals"
import { FormSkeleton } from "@/components/skeletons"
import { Icons } from "@/components/icons"
import {
  validateFinancialBalance,
  formatBalanceErrors,
  canValidateBalance
} from "@/features/execution/utils/balance-validation"
import {
  getActiveQuarters,
  generateQuarterLabelsWithStatus,
  isQuarterDisabled,
  filterPlanningTotalsForActiveQuarters
} from "@/features/execution/utils/quarter-management"
import { useTempSaveForForm, useTempSaveStore } from "@/features/execution/stores/temp-save-store"
import {
  createMetadataFromProps,
  captureFormState,
  restoreFormState,
  formatSaveTime,
  hasUnsavedChanges
} from "@/features/execution/utils/temp-save-utils"
import {
  generateTabId,
  createFormContext,
  registerTab,
  updateTabHeartbeat,
  detectMultipleTabs,
  checkVersionCompatibility,
  migrateSavedData,
  validateSavedDataIntegrity,
  cleanupInactiveTabs
} from "@/features/execution/utils/conflict-handling"

// Form modes
export type ExecutionFormMode = 'create' | 'view' | 'edit';

// Extended props interface
export interface ExecutionFormProps extends Omit<FinancialTableProps, 'readOnly'> {
  mode?: ExecutionFormMode;
  onStatusChange?: (status: 'draft' | 'submitted' | 'approved' | 'rejected') => void;
  status?: FinancialReport['status'];
  disabled?: boolean;
  district?: string;
  facilityType?: string;
  facilityId?: number;
}

// get current year
const currentYear = getCurrentFiscalYear();

// Helper component for free-typing comments without lag
function CommentInputCell({
  rowId,
  value,
  readOnly,
  label,
  onChange,
}: {
  rowId: string;
  value: string;
  readOnly?: boolean;
  label: string;
  onChange: (newVal: string) => void;
}) {
  const [localValue, setLocalValue] = React.useState(value || "");

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value);
    },
    []
  );

  const handleBlur = React.useCallback(() => {
    onChange(localValue);
  }, [localValue, onChange]);

  // Keep local state in sync when external data changes (e.g., reset form)
  React.useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  return (
    <Input
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={readOnly}
      className="h-8 w-52"
      placeholder="Add comment..."
      aria-label={label}
    />
  );
}

export function ExecutionForm({
  data: initialData,
  fiscalYear = currentYear,
  onSave,
  mode = 'create',
  status = 'draft',
  onStatusChange,
  expandedRowIds: initialExpandedRowIds,
  selectedFacility,
  facilityType: facilityTypeProp,
  selectedReportingPeriod,
  programName,
  isHospitalMode = false,
  disabled = false,
  district,
  facilityId: passedFacilityId,
}: ExecutionFormProps) {
  const router = useRouter();
  const [executionForm, setExecutionForm] = useState<boolean>(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => {
    // If in view mode, expand all rows by collecting all IDs with children
    if (mode === 'view' && initialData) {
      const allIds = new Set<string>();
      const collectIds = (rows: FinancialRow[]) => {
        rows.forEach(row => {
          if (row.children?.length) {
            allIds.add(row.id);
            collectIds(row.children);
          }
        });
      };
      collectIds(initialData);

      // Force expand categories A-G if they have children
      const categories = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      categories.forEach(categoryId => {
        const category = initialData.find(r => r.id === categoryId);
        if (category && category.children?.length) {
          allIds.add(categoryId);
        }
      });

      return allIds;
    }

    // For edit/create modes, expand all subcategories by default
    const defaultExpanded = new Set(initialExpandedRowIds || []);

    // Auto-expand subcategories (they have IDs like "B-01", "B-02", etc.)
    const autoExpandSubcategories = (rows: FinancialRow[]) => {
      rows.forEach(row => {
        // Auto-expand subcategories (they typically have hyphenated IDs like "B-01", "B-02")
        if (row.id.includes('-') && row.children?.length) {
          defaultExpanded.add(row.id);
        }
        // Recursively check children
        if (row.children?.length) {
          autoExpandSubcategories(row.children);
        }
      });
    };

    if (initialData) {
      autoExpandSubcategories(initialData);
    }

    return defaultExpanded;
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);



  // Infer a simple facility type string that can be sent to the backend.
  // If `isHospitalMode` is true we consider it a hospital, otherwise a health center.
  const facilityType = isHospitalMode ? 'hospital' : 'health_center';
  const facilityName = selectedFacility || '';

  // Determine if the form is readonly based on mode and status
  const isReadOnly = useMemo(() => {
    const readonly = mode === 'view' || (mode === 'edit' && status === 'approved');
    return readonly;
  }, [mode, status]);

  // Handle form methods
  const methods = useForm<FinancialTableDataPayload>({
    defaultValues: {
      tableData: [],
      metadata: {
        project: programName,
        healthFacility: facilityName,
        healthFacilityType: facilityType,
        district: undefined,
        healthCenter: facilityName,
        reportingPeriod: selectedReportingPeriod,
        fiscalYear: fiscalYear.toString(),
        facilityId: 0,
        facilityName: '',
        reportingPeriodId: 0,
        projectId: 0,
        projectName: '',
        authorId: 0,
      }
    }
  });

  // We need to track when parent props change, so we can update our state accordingly
  useEffect(() => {
    const hasRequiredSelections = !isReadOnly || (
      (isHospitalMode || (selectedFacility && selectedFacility !== "")) &&
      (selectedReportingPeriod && selectedReportingPeriod !== "")
    );

    if (!hasRequiredSelections && executionForm && !isReadOnly) {
      setExecutionForm(false);
    }

  }, [selectedFacility, selectedReportingPeriod, isHospitalMode, isReadOnly, executionForm]);

  const defaultData = useMemo(() => {
    const template = generateEmptyFinancialTemplate();

    if (initialData && initialData.length > 0) {
      // Edit mode: use initial data + calculate totals
      // Note: mergeWithTemplateRobust doesn't exist, using initialData directly
      const calculated = calculateHierarchicalTotals(initialData);
      return calculated;
    } else {
      // Create mode: use template + calculate totals
      return calculateHierarchicalTotals(template);
    }
  }, [initialData]);

  const [formData, setFormData] = useState<FinancialRow[]>(defaultData);

  // Auto-expand subcategories when data changes
  useEffect(() => {
    if (mode === 'view' || !formData?.length) return;

    const autoExpandSubcategories = (rows: FinancialRow[]) => {
      const subcategoryIds = new Set<string>();

      rows.forEach(row => {
        // Auto-expand subcategories (they typically have hyphenated IDs like "B-01", "B-02")
        if (row.id.includes('-') && row.children?.length) {
          subcategoryIds.add(row.id);
        }
        // Recursively check children
        if (row.children?.length) {
          const childSubcategories = autoExpandSubcategories(row.children);
          childSubcategories.forEach(id => subcategoryIds.add(id));
        }
      });

      return subcategoryIds;
    };

    const subcategoryIds = autoExpandSubcategories(formData);
    if (subcategoryIds.size > 0) {
      setExpandedRows(prev => {
        const newExpanded = new Set(prev);
        subcategoryIds.forEach(id => newExpanded.add(id));
        return newExpanded;
      });
    }
  }, [formData, mode]);


  // Use the passed facility ID directly
  const facilityId = passedFacilityId ?? null;

  // Create metadata for temporary save functionality
  const tempSaveMetadata = useMemo(() => {
    return createMetadataFromProps({
      facilityId,
      selectedFacility,
      selectedReportingPeriod,
      programName,
      fiscalYear,
      mode,
      district,
      isHospitalMode
    });
  }, [facilityId, selectedFacility, selectedReportingPeriod, programName, fiscalYear, mode, district, isHospitalMode]);

  // Use temp save hook
  const {
    saveTemporary,
    restoreTemporary,
    removeTemporary,
    hasSave,
    lastSaved,
    save: existingSave
  } = useTempSaveForForm(tempSaveMetadata);

  // Access store for maintenance operations
  const tempSaveStore = useTempSaveStore();

  // Temp save state
  const [isTempSaving, setIsTempSaving] = useState(false);
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);

  // Auto-save state
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState<string | null>(null);
  const [userActivity, setUserActivity] = useState<number>(Date.now());

  // Conflict handling state
  const [tabId] = useState(generateTabId());
  const [showMultiTabWarning, setShowMultiTabWarning] = useState(false);
  const [multiTabData, setMultiTabData] = useState<{ otherTabs: any[] }>({ otherTabs: [] });

  // Temporary save function
  const handleTempSave = useCallback(async () => {
    if (isReadOnly) return;

    setIsTempSaving(true);
    try {
      // Create fallback metadata if none exists
      const fallbackMetadata = tempSaveMetadata || {
        facilityId: facilityId || 0,
        facilityName: selectedFacility || 'Test Facility',
        reportingPeriod: selectedReportingPeriod || 'Test Period',
        programName: programName || 'Test Program',
        fiscalYear: fiscalYear.toString(),
        mode: mode || 'create',
        district: district || 'Test District',
        facilityType: isHospitalMode ? 'hospital' : 'health_center'
      };

      console.log('💾 [handleTempSave] About to capture form state...');
      console.log('💾 [handleTempSave] formData length:', formData?.length);
      console.log('💾 [handleTempSave] formData sample:', formData?.slice(0, 2).map(r => ({ id: r.id, title: r.title, q1: r.q1, q2: r.q2 })));

      const currentState = captureFormState(
        formData,
        methods,
        expandedRows,
        fallbackMetadata
      );

      console.log('💾 [handleTempSave] Captured state formData length:', currentState.formData?.length);

      saveTemporary(
        currentState.formData,
        currentState.formValues,
        currentState.expandedRows
      );

      setLastAutoSaved(new Date().toISOString());

      toast.success("Draft saved successfully", {
        description: "Your progress has been saved and will be available when you return.",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error("Failed to save draft", {
        description: "An error occurred while saving your progress.",
        duration: 4000,
      });
    } finally {
      setIsTempSaving(false);
    }
  }, [tempSaveMetadata, isReadOnly, formData, methods, expandedRows, saveTemporary, facilityId, selectedFacility, selectedReportingPeriod, programName, fiscalYear, mode, district, isHospitalMode]);

  // Enhanced restore with conflict handling
  const handleRestoreTemp = useCallback(() => {
    if (!existingSave) return;

    // Validate data integrity first
    const integrity = validateSavedDataIntegrity(existingSave);
    if (!integrity.isValid && !integrity.canRecover) {
      toast.error("Cannot restore draft", {
        description: `Data integrity issues: ${integrity.errors.join(', ')}`,
        duration: 4000,
      });
      return;
    }

    // Check version compatibility
    const compatibility = checkVersionCompatibility(existingSave);
    let dataToRestore = existingSave;

    if (!compatibility.isCompatible) {
      if (compatibility.canMigrate) {
        const migrated = migrateSavedData(existingSave);
        if (migrated) {
          dataToRestore = migrated;
          toast.info("Draft upgraded", {
            description: "Your saved draft has been updated to the current version.",
            duration: 3000,
          });
        } else {
          toast.error("Migration failed", {
            description: "Could not upgrade your saved draft to the current version.",
            duration: 4000,
          });
          return;
        }
      } else {
        toast.error("Incompatible draft", {
          description: compatibility.warnings.join(' '),
          duration: 4000,
        });
        return;
      }
    }

    const success = restoreFormState(
      dataToRestore,
      setFormData,
      setExpandedRows,
      methods
    );

    if (success) {
      toast.success("Draft restored successfully", {
        description: `Restored data from ${formatSaveTime(dataToRestore.timestamps.lastSaved)}`,
        duration: 3000,
      });
      setShowRestoreBanner(false);
      setIsDirty(true); // Mark as dirty since we've changed the form
    } else {
      toast.error("Failed to restore draft", {
        description: "The saved data appears to be incompatible with the current form.",
        duration: 4000,
      });
    }
  }, [existingSave, methods]);

  // Show restore banner when saved data exists
  useEffect(() => {
    if (hasSave && !isReadOnly && tempSaveMetadata) {
      setShowRestoreBanner(true);
    }
  }, [hasSave, isReadOnly, tempSaveMetadata]);

  // Auto-save function
  const handleAutoSave = useCallback(async () => {
    if (isReadOnly || !isDirty || isSaving || isTempSaving) return;

    setIsAutoSaving(true);
    try {
      // Create fallback metadata if none exists
      const fallbackMetadata = tempSaveMetadata || {
        facilityId: facilityId || 0,
        facilityName: selectedFacility || 'Auto-Save',
        reportingPeriod: selectedReportingPeriod || 'Auto-Save',
        programName: programName || 'Auto-Save',
        fiscalYear: fiscalYear.toString(),
        mode: mode || 'create',
        district: district || 'Auto-Save',
        facilityType: isHospitalMode ? 'hospital' : 'health_center'
      };

      console.log('🔄 [handleAutoSave] About to capture form state...');
      console.log('🔄 [handleAutoSave] formData length:', formData?.length);
      console.log('🔄 [handleAutoSave] formData sample:', formData?.slice(0, 2).map(r => ({ id: r.id, title: r.title, q1: r.q1, q2: r.q2 })));

      const currentState = captureFormState(
        formData,
        methods,
        expandedRows,
        fallbackMetadata
      );

      console.log('🔄 [handleAutoSave] Captured state formData length:', currentState.formData?.length);

      saveTemporary(
        currentState.formData,
        currentState.formValues,
        currentState.expandedRows
      );

      setLastAutoSaved(new Date().toISOString());

      // Subtle success indicator
      toast.success("Auto-saved", {
        duration: 1500,
        position: "bottom-right"
      });
    } catch (error) {
      console.error('Auto-save error:', error);
      // Don't show error toast for auto-save failures to avoid disrupting user
    } finally {
      setIsAutoSaving(false);
    }
  }, [isReadOnly, isDirty, isSaving, isTempSaving, tempSaveMetadata, formData, methods, expandedRows, saveTemporary, facilityId, selectedFacility, selectedReportingPeriod, programName, fiscalYear, mode, district, isHospitalMode]);

  // Track user activity
  const updateUserActivity = useCallback(() => {
    setUserActivity(Date.now());
  }, []);

  // Set up auto-save interval
  useEffect(() => {
    if (isReadOnly) return;

    const AUTO_SAVE_INTERVAL = 45000; // 45 seconds
    const ACTIVITY_TIMEOUT = 120000; // 2 minutes - only auto-save if user was active recently

    const autoSaveInterval = setInterval(() => {
      const timeSinceActivity = Date.now() - userActivity;

      // Only auto-save if user was active recently and form is dirty
      if (timeSinceActivity < ACTIVITY_TIMEOUT && isDirty && !isSaving && !isTempSaving && !isAutoSaving) {
        handleAutoSave();
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(autoSaveInterval);
  }, [isReadOnly, userActivity, isDirty, isSaving, isTempSaving, isAutoSaving, handleAutoSave]);

  // Track user activity on form interactions
  useEffect(() => {
    if (isReadOnly) return;

    const activityEvents = ['input', 'change', 'keydown', 'click'];

    const handleActivity = () => {
      updateUserActivity();
    };

    // Add listeners to document
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [isReadOnly, updateUserActivity]);

  // Periodic maintenance - cleanup expired saves and invalid data
  useEffect(() => {
    if (isReadOnly) return;

    const MAINTENANCE_INTERVAL = 5 * 60 * 1000; // 5 minutes

    // Run initial maintenance after 30 seconds
    const initialTimeout = setTimeout(() => {
      const result = tempSaveStore.performMaintenance();
      if (result.totalCleaned > 0) {
        // Cleaned up temporary saves
      }
    }, 30000);

    // Run periodic maintenance
    const maintenanceInterval = setInterval(() => {
      const result = tempSaveStore.performMaintenance();
      if (result.totalCleaned > 0) {
        // Maintenance: Cleaned up saves
      }
    }, MAINTENANCE_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(maintenanceInterval);
    };
  }, [isReadOnly, tempSaveStore]);

  // Tab tracking and conflict detection
  useEffect(() => {
    if (isReadOnly || !tempSaveMetadata) return;

    const formContext = createFormContext(tempSaveMetadata);

    // Clean up any stale tabs first (important for page refreshes)
    cleanupInactiveTabs();

    // Wait a moment for cleanup, then register this tab
    const registrationTimeout = setTimeout(() => {
      registerTab(tabId, formContext);

    }, 100);

    // Set up heartbeat to keep tab alive
    const heartbeatInterval = setInterval(() => {
      updateTabHeartbeat(tabId);

      // Check for multiple tabs periodically (but be more lenient)
      const tabCheck = detectMultipleTabs(formContext, tabId);

      // Only show warning if there are genuinely other tabs (not just this one duplicated)
      const realOtherTabs = tabCheck.otherTabs.filter(tab =>
        tab.tabId !== tabId &&
        (Date.now() - tab.lastHeartbeat) < 20000 // Active within last 20 seconds
      );

      if (realOtherTabs.length > 0 && !showMultiTabWarning) {
        setMultiTabData({ otherTabs: realOtherTabs });
        setShowMultiTabWarning(true);
      } else if (realOtherTabs.length === 0 && showMultiTabWarning) {
        // Hide warning if no other tabs anymore
        setShowMultiTabWarning(false);
      }
    }, 15000); // Every 15 seconds (less frequent)

    // Cleanup inactive tabs more frequently
    const cleanupInterval = setInterval(() => {
      const cleaned = cleanupInactiveTabs();
      if (cleaned > 0) {
        // Cleaned up inactive tabs
      }
    }, 20000);

    return () => {
      clearTimeout(registrationTimeout);
      clearInterval(heartbeatInterval);
      clearInterval(cleanupInterval);

      // Important: Remove this tab when component unmounts
      try {
        const stored = localStorage.getItem('temp-save-active-tabs');
        if (stored) {
          const allTabs = JSON.parse(stored);
          delete allTabs[tabId];
          localStorage.setItem('temp-save-active-tabs', JSON.stringify(allTabs));
        }
      } catch (error) {
        console.warn('Error removing tab on unmount:', error);
      }
    };
  }, [isReadOnly, tempSaveMetadata, tabId, showMultiTabWarning]);

  // Use planning totals hook
  const {
    data: planningTotals,
    isLoading: isPlanningLoading,
    error: planningError
  } = usePlanningTotals(facilityId, !isReadOnly && mode !== 'create');

  // Auto-apply planning totals when available (only for active quarters)
  useEffect(() => {
    const hasData = planningTotals && planningTotals.grandTotal > 0;

    if (hasData && !isReadOnly && !isPlanningLoading) {
      // Filter planning totals to only include active quarters
      const { activeQuarters } = getActiveQuarters();
      const filteredTotals = filterPlanningTotalsForActiveQuarters(
        {
          q1: planningTotals.q1Total,
          q2: planningTotals.q2Total,
          q3: planningTotals.q3Total,
          q4: planningTotals.q4Total,
          total: planningTotals.grandTotal
        },
        activeQuarters
      );

      setFormData(prevData => {
        const updatedData = prevData.map(row => {
          // Find the "Transfers from SPIU/RBC" field (id: 2 or "a2" or "A2")
          if (String(row.id) === "2" || row.id === "a2" || row.id === "A2") {
            return {
              ...row,
              q1: filteredTotals.q1,
              q2: filteredTotals.q2,
              q3: filteredTotals.q3,
              q4: filteredTotals.q4,
              cumulativeBalance: filteredTotals.total,
              isEditable: false,
              isCalculated: true,
              comments: `Auto-filled from planning data for active quarters (${activeQuarters.map(q => `Q${q}`).join(', ')})`
            };
          }

          // Recursively apply to children
          if (row.children && row.children.length > 0) {
            return {
              ...row,
              children: row.children.map(child => {
                if (String(child.id) === "2" || child.id === "a2" || child.id === "A2") {
                  return {
                    ...child,
                    q1: filteredTotals.q1,
                    q2: filteredTotals.q2,
                    q3: filteredTotals.q3,
                    q4: filteredTotals.q4,
                    cumulativeBalance: filteredTotals.total,
                    isEditable: false,
                    isCalculated: true,
                    comments: `Auto-filled from planning data for active quarters (${activeQuarters.map(q => `Q${q}`).join(', ')})`
                  };
                }
                return child;
              })
            };
          }

          return row;
        });

        // Recalculate totals after applying planning data
        const calculatedData = calculateHierarchicalTotals(updatedData);

        // Show success toast with active quarters info
        const quarterNames = activeQuarters.map(q => `Q${q}`).join(', ');
        toast.success(
          `"Transfers from SPIU/RBC" auto-filled for active quarters (${quarterNames}) with ${filteredTotals.total.toLocaleString()}`
        );

        return calculatedData;
      });
    }
  }, [planningTotals, isReadOnly, isPlanningLoading, mode]);

  // Show loading/error feedback for planning data
  useEffect(() => {
    if (isPlanningLoading && facilityId && !isReadOnly) {
      toast.loading("Loading planning data for auto-fill...", { id: 'planning-loading' });
    } else {
      toast.dismiss('planning-loading');
    }

    if (planningError && facilityId && !isReadOnly) {
      toast.error("Failed to load planning data for auto-fill");
    }
  }, [isPlanningLoading, planningError, facilityId, isReadOnly]);

  useEffect(() => {
    if (isReadOnly) return;

    console.log('👀 [ExecutionForm] Setting up form watch...');
    let timeoutId: NodeJS.Timeout;

    const subscription = methods.watch((value) => {
      console.log('👀 [ExecutionForm] Form value changed, debouncing...');
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        console.log('👀 [ExecutionForm] Debounce complete, processing changes...');
        const formValues = value as {
          rows?: Record<string, {
            q1?: string;
            q2?: string;
            q3?: string;
            q4?: string;
            comments?: string;
          } | undefined>
        };

        if (!formValues?.rows) return;

        const updateRowsWithFormValues = (rows: FinancialRow[]): FinancialRow[] => {
          return rows.map(row => {
            const rowId = row.id as string;
            if (formValues.rows && rowId in formValues.rows) {
              const rowFormValues = formValues.rows[rowId];
              if (!rowFormValues) return row;

              const updatedRow = { ...row };
              let hasChanges = false;

              if (rowFormValues.q1 !== undefined) {
                const numValue = rowFormValues.q1 === '' ? undefined : parseFloat(rowFormValues.q1);
                if (numValue !== row.q1) {
                  updatedRow.q1 = numValue;
                  hasChanges = true;
                }
              }
              if (rowFormValues.q2 !== undefined) {
                const numValue = rowFormValues.q2 === '' ? undefined : parseFloat(rowFormValues.q2);
                if (numValue !== row.q2) {
                  updatedRow.q2 = numValue;
                  hasChanges = true;
                }
              }
              if (rowFormValues.q3 !== undefined) {
                const numValue = rowFormValues.q3 === '' ? undefined : parseFloat(rowFormValues.q3);
                if (numValue !== row.q3) {
                  updatedRow.q3 = numValue;
                  hasChanges = true;
                }
              }
              if (rowFormValues.q4 !== undefined) {
                const numValue = rowFormValues.q4 === '' ? undefined : parseFloat(rowFormValues.q4);
                if (numValue !== row.q4) {
                  updatedRow.q4 = numValue;
                  hasChanges = true;
                }
              }
              if (rowFormValues.comments !== row.comments) {
                updatedRow.comments = rowFormValues.comments;
                hasChanges = true;
              }

              // Map VAT-specific fields (netAmount and vatAmount)
              // @ts-ignore - netAmount and vatAmount may exist for VAT-applicable expenses
              if (rowFormValues.netAmount) {
                updatedRow.netAmount = {
                  // @ts-ignore
                  q1: rowFormValues.netAmount.q1,
                  // @ts-ignore
                  q2: rowFormValues.netAmount.q2,
                  // @ts-ignore
                  q3: rowFormValues.netAmount.q3,
                  // @ts-ignore
                  q4: rowFormValues.netAmount.q4,
                };
                hasChanges = true;
              }
              // @ts-ignore - netAmount and vatAmount may exist for VAT-applicable expenses
              if (rowFormValues.vatAmount) {
                updatedRow.vatAmount = {
                  // @ts-ignore
                  q1: rowFormValues.vatAmount.q1,
                  // @ts-ignore
                  q2: rowFormValues.vatAmount.q2,
                  // @ts-ignore
                  q3: rowFormValues.vatAmount.q3,
                  // @ts-ignore
                  q4: rowFormValues.vatAmount.q4,
                };
                hasChanges = true;
              }

              if (row.children) {
                const updatedChildren = updateRowsWithFormValues(row.children);
                if (updatedChildren !== row.children) {
                  updatedRow.children = updatedChildren;
                  hasChanges = true;
                }
              }

              return hasChanges ? updatedRow : row;
            }

            if (row.children) {
              const updatedChildren = updateRowsWithFormValues(row.children);
              return updatedChildren !== row.children ? { ...row, children: updatedChildren } : row;
            }

            return row;
          });
        };


        const updatedData = updateRowsWithFormValues(formData);
        const hasChanges = JSON.stringify(updatedData) !== JSON.stringify(formData);

        if (hasChanges) {
          console.log('🔄 [ExecutionForm] Form data changed, recalculating totals...');

          // Debug: Check Section D before calculation
          const sectionDBefore = updatedData.find(row => row.id === 'D');
          if (sectionDBefore) {
            console.log('🔄 [ExecutionForm] Section D BEFORE calculation:', {
              q1: sectionDBefore.q1,
              q2: sectionDBefore.q2,
              cumulativeBalance: sectionDBefore.cumulativeBalance,
              children: sectionDBefore.children?.map((c: any) => ({
                id: c.id,
                title: c.title,
                q1: c.q1,
                q2: c.q2,
                cumulativeBalance: c.cumulativeBalance
              }))
            });
          }

          const calculatedData = calculateHierarchicalTotals(updatedData);

          // Debug: Check Section D after calculation
          const sectionDAfter = calculatedData.find(row => row.id === 'D');
          if (sectionDAfter) {
            console.log('🔄 [ExecutionForm] Section D AFTER calculation:', {
              q1: sectionDAfter.q1,
              q2: sectionDAfter.q2,
              cumulativeBalance: sectionDAfter.cumulativeBalance,
              children: sectionDAfter.children?.map((c: any) => ({
                id: c.id,
                title: c.title,
                q1: c.q1,
                q2: c.q2,
                cumulativeBalance: c.cumulativeBalance
              }))
            });
          }

          setFormData(calculatedData);
          setIsDirty(true);
        }
      }, 750);
    });

    return () => {
      if (subscription?.unsubscribe) subscription.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [formData, methods, isReadOnly]);



  // Only validate balance on submit attempt (removed real-time validation)

  const flattenedRows = useMemo(() => {
    const flattened: Array<FinancialRow & { depth: number }> = []

    const flatten = (rows: FinancialRow[], depth = 0) => {
      for (const row of rows) {
        flattened.push({ ...row, depth })
        if (row.children && expandedRows.has(row.id)) {
          flatten(row.children, depth + 1)
        }
      }
    }

    flatten(formData)
    return flattened
  }, [formData, expandedRows])

  const handleToggleExpand = useCallback((rowId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(rowId)) {
        newSet.delete(rowId)
      } else {
        newSet.add(rowId)
      }
      return newSet
    })
  }, [])

  const handleCommentChange = useCallback((rowId: string, comment: string) => {
    if (isReadOnly) return;

    // @ts-ignore – dynamic path not covered by generic type but still valid
    methods.setValue(`rows.${rowId}.comments`, comment, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }, [methods, isReadOnly]);

  const columns = useMemo<ColumnDef<FinancialRow & { depth: number }>[]>(() => {
    const quarterLabels = generateQuarterLabelsWithStatus();

    return [
      {
        accessorKey: "title",
        header: "Activity Details",
        cell: ({ row }) => {
          const { depth, title, isCategory, children } = row.original
          const hasChildren = children && children.length > 0

          return (
            <div
              className={cn(
                "flex items-center",
                isCategory && "font-bold",
                !isCategory && "text-sm"
              )}
              style={{ paddingLeft: `${depth * 1.5}rem` }}
            >
              {hasChildren && mode !== 'view' && (
                <button
                  onClick={() => handleToggleExpand(row.original.id)}
                  className="mr-1 h-4 w-4 text-muted-foreground hover:text-foreground"
                >
                  {expandedRows.has(row.original.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}
              {(!hasChildren || mode === 'view') && <div className="w-4 mr-1" />}
              <span className={cn(
                row.original.isCalculated && "font-medium"
              )}>
                {title}
              </span>
              {row.original.isCalculated && (
                <span className="ml-1 text-xs">(Auto-calculated)</span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "q1",
        header: () => (
          <div className="flex flex-col items-center">
            <span className={cn(
              quarterLabels[0].isDisabled && "text-gray-400"
            )}>
              {quarterLabels[0].line1}
              {quarterLabels[0].isCurrent && " ✨"}
            </span>
            <span className={cn(
              "text-xs font-normal",
              quarterLabels[0].isDisabled && "text-gray-400"
            )}>
              {quarterLabels[0].line2}
              {quarterLabels[0].isDisabled && " (Future)"}
            </span>
          </div>
        ),
        cell: ({ row }) => {
          const isCategory = row.original.isCategory;
          const isEditable = row.original.isEditable !== false;
          const isCalculated = row.original.isCalculated;
          const isQuarterDisabled = quarterLabels[0].isDisabled;
          const value = row.original.q1;
          const formattedValue = value !== undefined ? value.toLocaleString() : "";

          return (
            <div className="text-center">
              {(isCategory || !isEditable || isReadOnly || isQuarterDisabled) ? (
                <div className="flex items-center justify-center">
                  <span className={cn(
                    isCategory && "font-bold",
                    isCalculated && "px-2 py-1 rounded",
                    isQuarterDisabled && "text-gray-400"
                  )}>
                    {isQuarterDisabled ? "" : formattedValue}
                  </span>
                  {isCalculated && !isQuarterDisabled && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="ml-1 text-xs cursor-help">ⓘ</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Auto-filled from planning data totals</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {isQuarterDisabled && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="ml-1 text-xs text-gray-400 cursor-help text-center"><Icons.lockerKeyHole size={16} /></span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Future quarter - not available for reporting yet</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <NumericInputCell
                    rowId={row.original.id}
                    field="q1"
                    value={value}
                    readOnly={isReadOnly}
                    label={`${row.original.title} ${quarterLabels[0].line1} ${quarterLabels[0].line2}`}
                  />
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "q2",
        header: () => (
          <div className="flex flex-col items-center">
            <span className={cn(
              quarterLabels[1].isDisabled && "text-gray-400"
            )}>
              {quarterLabels[1].line1}
              {quarterLabels[1].isCurrent && " ✨"}
            </span>
            <span className={cn(
              "text-xs font-normal",
              quarterLabels[1].isDisabled && "text-gray-400"
            )}>
              {quarterLabels[1].line2}
              {quarterLabels[1].isDisabled && " (Future)"}
            </span>
          </div>
        ),
        cell: ({ row }) => {
          const isCategory = row.original.isCategory;
          const isEditable = row.original.isEditable !== false;
          const isCalculated = row.original.isCalculated;
          const isQuarterDisabled = quarterLabels[1].isDisabled;
          const value = row.original.q2;
          const formattedValue = value !== undefined ? value.toLocaleString() : "";

          return (
            <div className="text-center">
              {(isCategory || !isEditable || isReadOnly || isQuarterDisabled) ? (
                <div className="flex items-center justify-center">
                  <span className={cn(
                    isCategory && "font-bold",
                    isCalculated && "px-2 py-1 rounded",
                    isQuarterDisabled && "text-gray-400"
                  )}>
                    {isQuarterDisabled ? "" : formattedValue}
                  </span>
                  {isCalculated && !isQuarterDisabled && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="ml-1 text-xs cursor-help">ⓘ</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Auto-filled from planning data totals</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {isQuarterDisabled && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="ml-1 text-xs text-gray-400 cursor-help text-center"><Icons.lockerKeyHole size={16} /></span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Future quarter - not available for reporting yet</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <NumericInputCell
                    rowId={row.original.id}
                    field="q2"
                    value={value}
                    readOnly={isReadOnly}
                    label={`${row.original.title} ${quarterLabels[1].line1} ${quarterLabels[1].line2}`}
                  />
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "q3",
        header: () => (
          <div className="flex flex-col items-center">
            <span className={cn(
              quarterLabels[2].isDisabled && "text-gray-400"
            )}>
              {quarterLabels[2].line1}
              {quarterLabels[2].isCurrent && " ✨"}
            </span>
            <span className={cn(
              "text-xs font-normal",
              quarterLabels[2].isDisabled && "text-gray-400"
            )}>
              {quarterLabels[2].line2}
              {quarterLabels[2].isDisabled && " (Future)"}
            </span>
          </div>
        ),
        cell: ({ row }) => {
          const isCategory = row.original.isCategory;
          const isEditable = row.original.isEditable !== false;
          const isCalculated = row.original.isCalculated;
          const isQuarterDisabled = quarterLabels[2].isDisabled;
          const value = row.original.q3;
          const formattedValue = value !== undefined ? value.toLocaleString() : "";

          return (
            <div className="text-center">
              {(isCategory || !isEditable || isReadOnly || isQuarterDisabled) ? (
                <div className="flex items-center justify-center">
                  <span className={cn(
                    isCategory && "font-bold",
                    isCalculated && "px-2 py-1 rounded",
                    isQuarterDisabled && "text-gray-400"
                  )}>
                    {isQuarterDisabled ? "" : formattedValue}
                  </span>
                  {isCalculated && !isQuarterDisabled && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="ml-1 cursor-help">ⓘ</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Auto-filled from planning data totals</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {isQuarterDisabled && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="ml-1 text-xs text-gray-400 cursor-help text-center"><Icons.lockerKeyHole size={16} /></span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Future quarter - not available for reporting yet</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <NumericInputCell
                    rowId={row.original.id}
                    field="q3"
                    value={value}
                    readOnly={isReadOnly}
                    label={`${row.original.title} ${quarterLabels[2].line1} ${quarterLabels[2].line2}`}
                  />
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "q4",
        header: () => (
          <div className="flex flex-col items-center">
            <span className={cn(
              quarterLabels[3].isDisabled && "text-gray-400"
            )}>
              {quarterLabels[3].line1}
              {quarterLabels[3].isCurrent && " ✨"}
            </span>
            <span className={cn(
              "text-xs font-normal",
              quarterLabels[3].isDisabled && "text-gray-400"
            )}>
              {quarterLabels[3].line2}
              {quarterLabels[3].isDisabled && " (Future)"}
            </span>
          </div>
        ),
        cell: ({ row }) => {
          const isCategory = row.original.isCategory;
          const isEditable = row.original.isEditable !== false;
          const isCalculated = row.original.isCalculated;
          const isQuarterDisabled = quarterLabels[3].isDisabled;
          const value = row.original.q4;
          const formattedValue = value !== undefined ? value.toLocaleString() : "";

          return (
            <div className="text-center">
              {(isCategory || !isEditable || isReadOnly || isQuarterDisabled) ? (
                <div className="flex items-center justify-center">
                  <span className={cn(
                    isCategory && "font-bold",
                    isCalculated && "px-2 py-1 rounded",
                    isQuarterDisabled && "text-gray-400"
                  )}>
                    {isQuarterDisabled ? "" : formattedValue}
                  </span>
                  {isCalculated && !isQuarterDisabled && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="ml-1 cursor-help">ⓘ</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Auto-filled from planning data totals</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {isQuarterDisabled && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="ml-1 text-xs text-gray-400 cursor-help text-center"><Icons.lockerKeyHole size={16} /></span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Future quarter - not available for reporting yet</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <NumericInputCell
                    rowId={row.original.id}
                    field="q4"
                    value={value}
                    readOnly={isReadOnly}
                    label={`${row.original.title} ${quarterLabels[3].line1} ${quarterLabels[3].line2}`}
                  />
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "cumulativeBalance",
        header: "Cumulative Balance",
        cell: ({ row }) => {
          const value = row.original.cumulativeBalance
          const isCategory = row.original.isCategory
          const formattedValue = value !== undefined ? value.toLocaleString() : ""

          return (
            <div className={cn("text-center", isCategory && "font-bold")}>
              {formattedValue}
            </div>
          )
        },
      },
      {
        accessorKey: "comments",
        header: "Comment",
        cell: ({ row }) => {
          const comment = row.original.comments || ""
          const isEditable = row.original.isEditable !== false

          if (row.original.isCategory) {
            return null
          }

          return (
            <div>
              {comment && !isEditable || isReadOnly ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm cursor-help underline underline-offset-4">
                        View comment
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-center">{comment}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : !isReadOnly && isEditable ? (
                <CommentInputCell
                  rowId={row.original.id}
                  value={comment}
                  readOnly={isReadOnly}
                  label={`Comment for ${row.original.title}`}
                  onChange={(newVal) => handleCommentChange(row.original.id, newVal)}
                />
              ) : null}
            </div>
          )
        },
      },
    ]
  }, [expandedRows, handleToggleExpand, handleCommentChange, fiscalYear, isReadOnly, mode])

  const tableConfig = useMemo(() => ({
    data: flattenedRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enablePagination: false,
  }), [flattenedRows, columns]);

  const table = useReactTable(tableConfig);

  // Helper function to prepare report data
  const prepareReportData = useCallback((): FinancialTableDataPayload => {
    return {
      tableData: formData,
      metadata: {
        facilityId: 0,
        facilityName: facilityName,
        healthFacilityType: facilityType,
        district: undefined,
        reportingPeriodId: 0,
        reportingPeriod: selectedReportingPeriod,
        projectId: 0,
        projectName: programName,
        authorId: 0,
        fiscalYear: fiscalYear.toString(),
        status,
        lastUpdated: new Date().toISOString(),
        healthCenter: facilityName,
      }
    };
  }, [formData, facilityName, selectedReportingPeriod, fiscalYear, mode, status, programName]);

  const handleSaveSuccess = useCallback(() => {
    setIsDirty(false);

    // Clear temporary save data on successful submission
    if (tempSaveMetadata) {
      removeTemporary();
      toast.success("Report saved successfully - draft cleared", {
        description: "Your temporary draft has been removed as the report is now officially saved.",
        duration: 3000,
      });
    }

    // toast.success(
    //   mode === 'create' ? "Report created successfully" : "Report updated successfully", 
    //   {
    //     description: mode === 'create' 
    //       ? "Your financial report has been created and saved as draft"
    //       : "Your financial report has been updated",
    //     duration: 3000,
    //   }
    // );
  }, [mode, tempSaveMetadata, removeTemporary]);

  const handleSaveError = useCallback((error: unknown) => {
    console.error("Error saving data:", error);
    toast.error(
      mode === 'create' ? "Failed to create report" : "Failed to update report",
      {
        description: "An error occurred while saving your financial report",
        duration: 4000,
      }
    );
  }, [mode]);

  const memoizedHandleSave = useCallback(async () => {
    if (!onSave) return;

    // Perform balance validation only on submit attempt (active quarters only)
    if (canValidateBalance(formData)) {
      const validation = validateFinancialBalance(formData);

      if (!validation.isBalanced) {
        const errorDetails = formatBalanceErrors(validation);

        // Show detailed error toast with timed duration
        toast.error(`❌ Cannot submit - Financial data is not balanced`, {
          description: `Net Financial Assets (F) must equal Closing Balance (G) for all active quarters.\n\n${errorDetails.join('\n')}`,
          duration: 3500,
          action: {
            label: "Review sections D, E, G",
            onClick: () => {
              toast.info("💡 Check Financial Assets (D), Financial Liabilities (E), and Closing Balance (G) sections", {
                duration: 3000
              });
            }
          }
        });

        return;
      } else {
        // Show brief success message
        toast.success("✅ Financial data is balanced - proceeding with submission", {
          duration: 1500
        });
      }
    }

    setIsSaving(true);
    try {
      const reportData = prepareReportData();

      // Build a rich report object (includes items, totals, facility metadata…)
      const fullReport = normalizeFinancialData(reportData);

      if (mode === 'edit') {
        const normalizedData = fullReport;
        const convertedData: FinancialTableDataPayload = {
          tableData: formData,
          metadata: {
            ...reportData.metadata,
            healthCenter: normalizedData.metadata.facility.name,
            reportingPeriod: normalizedData.reportingPeriod,
            fiscalYear: normalizedData.fiscalYear,
            status: normalizedData.status
          }
        };
        await onSave(convertedData);
      } else {
        await onSave(reportData);
      }

      handleSaveSuccess();
    } catch (error) {
      handleSaveError(error);
    } finally {
      setIsSaving(false);
    }
  }, [
    onSave,
    mode,
    formData,
    prepareReportData,
    handleSaveSuccess,
    handleSaveError
  ]);

  // Update expanded rows when mode changes
  useEffect(() => {
    if (mode === 'view' && formData) {
      const allIds = new Set<string>();
      const collectIds = (rows: FinancialRow[]) => {
        rows.forEach(row => {
          if (row.children?.length) {
            allIds.add(row.id);
            collectIds(row.children);
          }
        });
      };
      collectIds(formData);

      // Force expand D section if it exists and has children (even with null values)
      if (formData.find(r => r.id === 'D') && formData.find(r => r.id === 'D')?.children?.length) {
        allIds.add('D');
      }

      setExpandedRows(allIds);
    }
  }, [mode, formData]);

  // Memoize the action buttons to avoid recreation on every render
  const ActionButtons = useMemo(() => {
    if (isReadOnly) return null;

    const canSubmit = isDirty && !isSaving && !disabled;
    // More lenient condition for temp save - allow even with minimal context
    const canTempSave = !isTempSaving && !isSaving && !isAutoSaving && !isReadOnly;

    return (
      <div className="flex gap-2">
        {/* {mode === 'edit' && status === 'draft' && (
          <Button
            onClick={() => onStatusChange?.('submitted')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isDirty || isSaving}
          >
            Submit Report
          </Button>
        )} */}
        {/* TODO: Add back button to go back to execution dashboard */}
        <Button
          onClick={() => router.push("/dashboard/execution")}
          className="bg-gray-700 hover:bg-gray-800 text-white"
        >
          Back
        </Button>

        {/* Temporary Save Button */}
        <Button
          onClick={handleTempSave}
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 font-semibold text-sm"
          disabled={!canTempSave}
        >
          {isTempSaving ? (
            <>
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              Saving Draft...
            </>
          ) : (
            <>
              <Icons.save className="mr-2 h-4 w-4" />
              Save Draft
            </>
          )}
        </Button>

        <Button
          onClick={memoizedHandleSave}
          className="bg-black text-white font-semibold text-sm hover:bg-black/80"
          disabled={!canSubmit}
        >
          {isSaving ? "Saving..." : mode === 'create' ? "Create report" : "Save changes"}
        </Button>
      </div>
    );
  }, [isReadOnly, mode, status, isDirty, isSaving, onStatusChange, memoizedHandleSave, disabled, isTempSaving, isAutoSaving, handleTempSave]);

  // Save Status Component
  const SaveStatus = useMemo(() => {
    if (isReadOnly) return null;

    const getStatusText = () => {
      if (isAutoSaving) {
        return (
          <div className="flex items-center text-xs text-blue-600">
            <Icons.spinner className="mr-1 h-3 w-3 animate-spin" />
            Auto-saving...
          </div>
        );
      }

      if (isTempSaving) {
        return (
          <div className="flex items-center text-xs text-blue-600">
            <Icons.spinner className="mr-1 h-3 w-3 animate-spin" />
            Saving draft...
          </div>
        );
      }

      if (isSaving) {
        return (
          <div className="flex items-center text-xs text-green-600">
            <Icons.spinner className="mr-1 h-3 w-3 animate-spin" />
            Saving...
          </div>
        );
      }

      if (lastAutoSaved || lastSaved) {
        const timestamp = lastAutoSaved || lastSaved;
        const timeAgo = timestamp ? formatSaveTime(timestamp) : null;
        const saveType = lastAutoSaved ? "Auto-saved" : "Last saved";

        return (
          <div className="flex items-center text-xs text-gray-500">
            <Icons.check className="mr-1 h-3 w-3 text-green-500" />
            {saveType}: {timeAgo}
          </div>
        );
      }

      if (isDirty) {
        return (
          <div className="text-xs text-orange-600">
            Unsaved changes
          </div>
        );
      }

      return null;
    };

    return getStatusText();
  }, [isReadOnly, isAutoSaving, isTempSaving, isSaving, lastAutoSaved, lastSaved, isDirty]);

  // Memoize the header content
  const HeaderContent = useMemo(() => (
    <div className="flex justify-between items-start">
      <div className="flex flex-col">
        <h2 className="text-sm capitalize font-semibold">
          {facilityName ? facilityName : ""} {facilityType === 'health_center' ? 'Health Center' : 'Hospital'}
        </h2>
        {SaveStatus}
        {/* {status && (
          <span className={cn(
            "text-sm px-2 py-1 rounded-full w-fit",
            status === 'draft' && "bg-yellow-100 text-yellow-800",
            status === 'submitted' && "bg-blue-100 text-blue-800",
            status === 'approved' && "bg-green-100 text-green-800",
            status === 'rejected' && "bg-red-100 text-red-800"
          )}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        )} */}
      </div>
      {ActionButtons}
    </div>
  ), [facilityName, facilityType, status, ActionButtons, SaveStatus]);

  // Show loading skeleton while planning data is being fetched
  if (isPlanningLoading && facilityId && !isReadOnly) {
    return (
      <div className="space-y-4">
        <Toaster richColors closeButton position="bottom-right" />

        <div className="bg-white p-4 rounded-lg mb-4 bg-zinc-50">
          {HeaderContent}
          <div className="flex flex-col gap-0 text-sm text-gray-600">
            <span className="capitalize">{district ? `${district} District` : ""}</span>
            <span>{selectedReportingPeriod} - {Number(selectedReportingPeriod) + 1}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg">
          <div className="text-center mb-4">
            <p className="text-sm text-gray-600">Loading planning data for auto-fill...</p>
          </div>
          <FormSkeleton fields={12} />
        </div>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <div className="space-y-4">
        <Toaster richColors closeButton position="bottom-right" />

        <div className="bg-white p-4 rounded-lg mb-4 bg-zinc-50">
          {HeaderContent}
          <div className="flex flex-col gap-0 text-sm text-gray-600">
            <span className="capitalize">{district ? `${district} District` : ""}</span>
            {/* <span>{fiscalYear}</span> */}
            <span>{selectedReportingPeriod} - {Number(selectedReportingPeriod) + 1}</span>
          </div>
        </div>



        {/* Multiple Tab Warning */}
        {showMultiTabWarning && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Icons.warning className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-orange-900">
                    Multiple Tabs Detected
                  </h3>
                  <div className="mt-1 text-sm text-orange-700">
                    <p>
                      You have this form open in {multiTabData.otherTabs.length + 1} browser tab{multiTabData.otherTabs.length > 0 ? 's' : ''}.
                      Changes made in other tabs may conflict with your work here.
                    </p>
                    <p className="mt-1 font-medium">
                      Recommendation: Save your work frequently and only edit in one tab at a time.
                    </p>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <Button
                      onClick={() => setShowMultiTabWarning(false)}
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      I Understand
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => setShowMultiTabWarning(false)}
                size="sm"
                variant="ghost"
                className="text-orange-500 hover:text-orange-700 hover:bg-orange-100"
              >
                <Icons.close className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Restoration Banner */}
        {showRestoreBanner && existingSave && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Icons.page className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-blue-900">
                    Draft Available
                  </h3>
                  <div className="mt-1 text-sm text-blue-700">
                    <p>
                      You have a saved draft from {formatSaveTime(existingSave.timestamps.lastSaved)}.
                      Would you like to continue where you left off?
                    </p>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <Button
                      onClick={handleRestoreTemp}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Restore Draft
                    </Button>
                    <Button
                      onClick={() => {
                        removeTemporary();
                        setShowRestoreBanner(false);
                        toast.success("Draft discarded");
                      }}
                      size="sm"
                      variant="outline"
                      className="text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                      Discard Draft
                    </Button>
                    <Button
                      onClick={() => setShowRestoreBanner(false)}
                      size="sm"
                      variant="ghost"
                      className="text-blue-700 hover:bg-blue-100"
                    >
                      Continue Without Restoring
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => setShowRestoreBanner(false)}
                size="sm"
                variant="ghost"
                className="text-blue-500 hover:text-blue-700 hover:bg-blue-100"
              >
                <Icons.close className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-md border overflow-auto max-h-[calc(100vh-16rem)]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background border-b">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        header.id.includes('balance') || header.id.includes('q') ? "text-center" : "",
                        "whitespace-nowrap",
                        header.id === "title" && "sticky left-0 z-20 bg-background shadow-[1px_0_0_0_#e5e7eb]"
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={cn(
                      row.original.isCategory && "bg-muted/50"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn("w-[200px] sticky left-0 z-10",
                          cell.column.id === "title" && "sticky left-0 bg-background shadow-[1px_0_0_0_#e5e7eb]",
                          row.original.isCategory && cell.column.id === "title" && "bg-muted/50"
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </FormProvider>
  );
} 