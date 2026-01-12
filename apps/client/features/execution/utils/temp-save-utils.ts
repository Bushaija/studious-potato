import { UseFormReturn } from 'react-hook-form'
import { FinancialRow } from '@/features/execution/schemas/execution-form-schema'
import { TempSaveMetadata, TempSaveData } from '@/features/execution/stores/temp-save-store'
import { ExecutionFormProps } from '@/features/execution/components/execution-form'

// Function to capture current form state for temporary saving
export const captureFormState = (
  formData: FinancialRow[],
  methods: UseFormReturn<any>,
  expandedRows: Set<string>,
  metadata: TempSaveMetadata
): {
  formData: FinancialRow[]
  formValues: Record<string, any>
  expandedRows: string[]
} => {
  try {
    // Performance optimization: Check data size before cloning
    const dataSize = JSON.stringify(formData).length
    if (dataSize > 5000000) { // 5MB limit
      console.warn('Form data is very large, save may be slow:', dataSize)
    }

    // Get current form values from react-hook-form
    const formValues = methods.getValues()
    
    // Convert Set to Array for serialization
    const expandedRowsArray = Array.from(expandedRows)
    
    // Optimize cloning for large datasets
    const cloneFormData = (data: FinancialRow[]): FinancialRow[] => {
      return data.map(row => ({
        ...row,
        children: row.children ? cloneFormData(row.children) : undefined
      }))
    }
    
    const clonedData = cloneFormData(formData);
    
    return {
      formData: clonedData, // Optimized deep clone
      formValues: JSON.parse(JSON.stringify(formValues)), // Deep clone form values
      expandedRows: expandedRowsArray
    }
  } catch (error) {
    console.error('❌ [captureFormState] Error capturing form state:', error)
    
    // Fallback: Try to save minimal data
    try {
      return {
        formData: formData.map(row => ({ ...row, children: undefined })), // Remove children to reduce size
        formValues: {},
        expandedRows: Array.from(expandedRows)
      }
    } catch (fallbackError) {
      console.error('Fallback capture also failed:', fallbackError)
      return {
        formData: [],
        formValues: {},
        expandedRows: []
      }
    }
  }
}

// Function to create metadata from form props
export const createMetadataFromProps = (props: {
  facilityId: number | null
  selectedFacility?: string
  selectedReportingPeriod?: string
  programName?: string
  fiscalYear: string | number
  mode: ExecutionFormProps['mode']
  district?: string
  isHospitalMode?: boolean
}): TempSaveMetadata | null => {
  // More lenient validation - allow temp save with basic info
  // We need at least some form context to make saves meaningful
  if (!props.selectedFacility && !props.facilityId && !props.selectedReportingPeriod) {
    return null
  }
  
  return {
    facilityId: props.facilityId || 0,
    facilityName: props.selectedFacility || 'Unknown Facility',
    reportingPeriod: props.selectedReportingPeriod || 'Unknown Period',
    programName: props.programName || 'Unknown Program',
    fiscalYear: props.fiscalYear.toString(),
    mode: props.mode || 'create',
    district: props.district || 'Unknown District',
    facilityType: props.isHospitalMode ? 'hospital' : 'health_center'
  }
}

// Function to restore form state from saved data
export const restoreFormState = (
  savedData: TempSaveData,
  setFormData: (data: FinancialRow[]) => void,
  setExpandedRows: (rows: Set<string>) => void,
  methods: UseFormReturn<any>
): boolean => {
  try {
    // Validate saved data structure
    if (!savedData || !savedData.formData || !Array.isArray(savedData.formData)) {
      console.warn('Invalid saved form data structure')
      return false
    }
    
    // Restore form data
    setFormData(savedData.formData)
    
    // Restore expanded rows
    const expandedRowsSet = new Set(savedData.expandedRows || [])
    setExpandedRows(expandedRowsSet)
    
    // Restore react-hook-form values
    if (savedData.formValues && typeof savedData.formValues === 'object') {
      // Reset form with saved values
      methods.reset(savedData.formValues)
      
      // Alternative: Set individual field values if reset doesn't work well
      Object.entries(savedData.formValues).forEach(([key, value]) => {
        try {
          methods.setValue(key, value, { shouldDirty: true })
        } catch (error) {
          console.warn(`Failed to restore form field ${key}:`, error)
        }
      })
    }
    
    return true
  } catch (error) {
    console.error('Error restoring form state:', error)
    return false
  }
}

// Function to validate if saved data is compatible with current form
export const validateSavedDataCompatibility = (
  savedData: TempSaveData,
  currentMetadata: TempSaveMetadata
): {
  isCompatible: boolean
  warnings: string[]
} => {
  const warnings: string[] = []
  
  // Check version compatibility
  const CURRENT_VERSION = '1.0.0'
  if (savedData.version !== CURRENT_VERSION) {
    warnings.push(`Version mismatch: saved (${savedData.version}) vs current (${CURRENT_VERSION})`)
  }
  
  // Check metadata compatibility
  if (savedData.metadata.facilityId !== currentMetadata.facilityId) {
    warnings.push('Different facility - saved data may not be relevant')
  }
  
  if (savedData.metadata.reportingPeriod !== currentMetadata.reportingPeriod) {
    warnings.push('Different reporting period - saved data may not be relevant')
  }
  
  if (savedData.metadata.programName !== currentMetadata.programName) {
    warnings.push('Different program - saved data may not be relevant')
  }
  
  if (savedData.metadata.mode !== currentMetadata.mode) {
    warnings.push(`Different form mode: saved (${savedData.metadata.mode}) vs current (${currentMetadata.mode})`)
  }
  
  // Check data structure
  if (!savedData.formData || !Array.isArray(savedData.formData)) {
    warnings.push('Invalid form data structure')
  }
  
  // More permissive compatibility check - allow some mismatches with warnings
  const isCompatible = warnings.filter(w => 
    w.includes('Invalid form data structure') || 
    w.includes('Version mismatch')
  ).length === 0
  
  return {
    isCompatible,
    warnings
  }
}

// Function to format timestamp for display
export const formatSaveTime = (timestamp: string): string => {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffSeconds < 60) {
      return 'Just now'
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString()
    }
  } catch (error) {
    return 'Unknown'
  }
}

// Function to check if form has unsaved changes
export const hasUnsavedChanges = (
  currentFormData: FinancialRow[],
  currentFormValues: Record<string, any>,
  savedData: TempSaveData | null
): boolean => {
  if (!savedData) return true
  
  try {
    // Simple comparison - you might want to make this more sophisticated
    const currentDataStr = JSON.stringify(currentFormData)
    const savedDataStr = JSON.stringify(savedData.formData)
    
    const currentValuesStr = JSON.stringify(currentFormValues)
    const savedValuesStr = JSON.stringify(savedData.formValues)
    
    return currentDataStr !== savedDataStr || currentValuesStr !== savedValuesStr
  } catch (error) {
    console.warn('Error comparing form data:', error)
    return true
  }
} 