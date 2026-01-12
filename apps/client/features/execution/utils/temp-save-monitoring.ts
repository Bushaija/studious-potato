import { useTempSaveStore } from '@/features/execution/stores/temp-save-store'

// Monitoring utilities for temporary save system
export interface TempSaveSystemStats {
  totalSaves: number
  totalSize: number
  oldestSave: string | null
  newestSave: string | null
  facilitiesWithSaves: number
  averageSaveAge: number
  storageHealth: 'good' | 'warning' | 'critical'
  issues: string[]
}

// Get comprehensive stats about the temporary save system
export const getTempSaveSystemStats = (): TempSaveSystemStats => {
  const store = useTempSaveStore.getState()
  const saves = store.getAllSaves()
  
  if (saves.length === 0) {
    return {
      totalSaves: 0,
      totalSize: 0,
      oldestSave: null,
      newestSave: null,
      facilitiesWithSaves: 0,
      averageSaveAge: 0,
      storageHealth: 'good',
      issues: []
    }
  }

  // Calculate stats
  const now = Date.now()
  const totalSize = saves.reduce((size, save) => {
    try {
      return size + JSON.stringify(save).length
    } catch {
      return size
    }
  }, 0)

  const timestamps = saves.map(save => new Date(save.timestamps.lastSaved).getTime())
  const oldestTimestamp = Math.min(...timestamps)
  const newestTimestamp = Math.max(...timestamps)
  
  const facilitiesWithSaves = new Set(saves.map(save => save.metadata.facilityId)).size
  
  const totalAge = saves.reduce((age, save) => {
    return age + (now - new Date(save.timestamps.lastSaved).getTime())
  }, 0)
  const averageSaveAge = totalAge / saves.length

  // Health assessment
  const issues: string[] = []
  let storageHealth: 'good' | 'warning' | 'critical' = 'good'

  // Check for large storage usage
  if (totalSize > 8000000) { // 8MB
    issues.push('High storage usage (>8MB)')
    storageHealth = 'critical'
  } else if (totalSize > 4000000) { // 4MB
    issues.push('Moderate storage usage (>4MB)')
    if (storageHealth === 'good') storageHealth = 'warning'
  }

  // Check for old saves
  const oldSaves = saves.filter(save => {
    const age = now - new Date(save.timestamps.lastSaved).getTime()
    return age > 7 * 24 * 60 * 60 * 1000 // 7 days
  })
  
  if (oldSaves.length > 0) {
    issues.push(`${oldSaves.length} saves older than 7 days`)
    if (storageHealth === 'good') storageHealth = 'warning'
  }

  // Check for corrupted saves
  const corruptedSaves = saves.filter(save => {
    try {
      return !save.formData || !Array.isArray(save.formData) || !save.metadata
    } catch {
      return true
    }
  })

  if (corruptedSaves.length > 0) {
    issues.push(`${corruptedSaves.length} corrupted saves detected`)
    storageHealth = 'critical'
  }

  // Check for too many saves
  if (saves.length > 50) {
    issues.push(`High number of saves (${saves.length})`)
    if (storageHealth === 'good') storageHealth = 'warning'
  }

  return {
    totalSaves: saves.length,
    totalSize,
    oldestSave: new Date(oldestTimestamp).toISOString(),
    newestSave: new Date(newestTimestamp).toISOString(),
    facilitiesWithSaves,
    averageSaveAge,
    storageHealth,
    issues
  }
}

// Format stats for console logging
export const logTempSaveStats = (): void => {
  const stats = getTempSaveSystemStats()
  
  console.group('🔍 Temporary Save System Stats')
  console.log('📊 Total Saves:', stats.totalSaves)
  console.log('💾 Total Size:', (stats.totalSize / 1024).toFixed(2), 'KB')
  console.log('🏥 Facilities with Saves:', stats.facilitiesWithSaves)
  
  if (stats.oldestSave) {
    console.log('📅 Oldest Save:', new Date(stats.oldestSave).toLocaleString())
  }
  if (stats.newestSave) {
    console.log('📅 Newest Save:', new Date(stats.newestSave).toLocaleString())
  }
  
  console.log('⏱️ Average Age:', Math.round(stats.averageSaveAge / (60 * 60 * 1000)), 'hours')
  console.log('💚 Health:', stats.storageHealth.toUpperCase())
  
  if (stats.issues.length > 0) {
    console.warn('⚠️ Issues:', stats.issues)
  }
  
  console.groupEnd()
}

// Performance testing utilities
export const performTempSaveStressTest = async (iterations: number = 10): Promise<{
  averageSaveTime: number
  averageRestoreTime: number
  successRate: number
  errors: string[]
}> => {
  console.log(`🧪 Starting stress test with ${iterations} iterations...`)
  
  const store = useTempSaveStore.getState()
  const errors: string[] = []
  const saveTimes: number[] = []
  const restoreTimes: number[] = []
  let successCount = 0

  // Generate test data
  const generateTestData = (size: 'small' | 'medium' | 'large') => {
    const baseData = {
      id: 'test',
      title: 'Test Row',
      q1: 1000,
      q2: 2000,
      q3: 3000,
      q4: 4000,
      cumulativeBalance: 10000,
      isCategory: false,
      isEditable: true,
      comments: 'Test comment',
      children: []
    }

    switch (size) {
      case 'small':
        return [baseData]
      case 'medium':
        return Array(100).fill(baseData)
      case 'large':
        return Array(1000).fill(baseData)
      default:
        return [baseData]
    }
  }

  for (let i = 0; i < iterations; i++) {
    try {
      const testId = `stress-test-${i}-${Date.now()}`
      const testData = generateTestData(i % 3 === 0 ? 'large' : i % 2 === 0 ? 'medium' : 'small')
      
      const metadata = {
        facilityId: 1,
        facilityName: 'Test Facility',
        reportingPeriod: 'Test Period',
        programName: 'Test Program',
        fiscalYear: '2024',
        mode: 'create' as const,
        district: 'Test District',
        facilityType: 'health_center' as const
      }

      // Test save
      const saveStart = performance.now()
      store.saveTemporary(testId, testData, {}, [], metadata)
      const saveEnd = performance.now()
      saveTimes.push(saveEnd - saveStart)

      // Test restore
      const restoreStart = performance.now()
      const restored = store.restoreTemporary(testId)
      const restoreEnd = performance.now()
      restoreTimes.push(restoreEnd - restoreStart)

      if (restored) {
        successCount++
      } else {
        errors.push(`Failed to restore save ${i}`)
      }

      // Cleanup
      store.removeTemporary(testId)

    } catch (error) {
      errors.push(`Error in iteration ${i}: ${error}`)
    }
  }

  const averageSaveTime = saveTimes.reduce((a, b) => a + b, 0) / saveTimes.length
  const averageRestoreTime = restoreTimes.reduce((a, b) => a + b, 0) / restoreTimes.length
  const successRate = (successCount / iterations) * 100

  console.log('🧪 Stress test completed:', {
    averageSaveTime: averageSaveTime.toFixed(2) + 'ms',
    averageRestoreTime: averageRestoreTime.toFixed(2) + 'ms',
    successRate: successRate.toFixed(1) + '%',
    errors: errors.length
  })

  return {
    averageSaveTime,
    averageRestoreTime,
    successRate,
    errors
  }
}

// Cleanup utility for development/testing
export const clearAllTempSaves = (): number => {
  const store = useTempSaveStore.getState()
  const beforeCount = store.getAllSaves().length
  store.clearAllTemporary()
  console.log(`🧹 Cleared ${beforeCount} temporary saves`)
  return beforeCount
}

// Export system info for debugging
export const exportTempSaveSystemInfo = (): string => {
  const stats = getTempSaveSystemStats()
  const store = useTempSaveStore.getState()
  const saves = store.getAllSaves()
  
  const systemInfo = {
    timestamp: new Date().toISOString(),
    stats,
    saves: saves.map(save => ({
      id: save.id,
      facility: save.metadata.facilityName,
      period: save.metadata.reportingPeriod,
      program: save.metadata.programName,
      created: save.timestamps.created,
      lastSaved: save.timestamps.lastSaved,
      size: JSON.stringify(save).length,
      version: save.version
    })),
    userAgent: navigator.userAgent,
    localStorage: {
      available: typeof Storage !== 'undefined',
      quota: 'unknown', // Would need requestStorageQuota API
    }
  }

  return JSON.stringify(systemInfo, null, 2)
}

// Debug utility for tab tracking
export const debugTabTracking = (): void => {
  try {
    const stored = localStorage.getItem('temp-save-active-tabs');
    if (!stored) {
      console.log('🔍 No active tabs registered');
      return;
    }
    
    const allTabs = JSON.parse(stored);
    const now = Date.now();
    
    console.group('🔍 Active Tabs Debug');
    console.log('📊 Total registered tabs:', Object.keys(allTabs).length);
    
    Object.values(allTabs).forEach((tab: any) => {
      const age = now - tab.lastHeartbeat;
      const isStale = age > 30000; // 30 seconds
      
      console.log(`${isStale ? '💀' : '💚'} Tab ${tab.tabId}:`, {
        formContext: tab.formContext,
        sessionId: tab.sessionId,
        ageMinutes: Math.round(age / 60000),
        isStale
      });
    });
    
    console.groupEnd();
  } catch (error) {
    console.error('Error debugging tabs:', error);
  }
}

// Clear all tab registrations (for debugging)
export const clearAllTabs = (): number => {
  try {
    const stored = localStorage.getItem('temp-save-active-tabs');
    const count = stored ? Object.keys(JSON.parse(stored)).length : 0;
    localStorage.removeItem('temp-save-active-tabs');
    console.log(`🧹 Cleared ${count} tab registrations`);
    return count;
  } catch (error) {
    console.error('Error clearing tabs:', error);
    return 0;
  }
}

// Debug form structure symmetry
export const debugFormStructure = (): void => {
  console.group('🏗️ Form Structure Debug')
  
  // Get current form data from the DOM (if ExecutionForm is mounted)
  const formElements = document.querySelectorAll('[data-form-mode]')
  
  if (formElements.length === 0) {
    console.log('No ExecutionForm components found on page')
    console.groupEnd()
    return
  }
  
  console.log('📊 Found', formElements.length, 'ExecutionForm component(s)')
  
  // Log structure information that should be identical between modes
  console.log('🔍 Check console logs above for:')
  console.log('  - "🔄 Edit mode: Merging saved data..." (edit mode)')
  console.log('  - "🆕 Create mode: Using template structure..." (create mode)')
  console.log('  - "🐛 ExecutionForm Debug" with formDataStructure details')
  
  console.log('✅ Both modes should show:')
  console.log('  - totalCategories: 7 (A, B, C, D, E, F, G)')
  console.log('  - expenditureSubcategories: 5 (B-01 to B-05)')
  console.log('  - calculatedFields: ["c", "f", "g"] (auto-calculated sections)')
  console.log('  - hasClosingBalanceChildren: 3 (G1, G2, G3)')
  
  console.groupEnd()
}

// Enable/disable merge debugging
export const enableMergeDebug = (): void => {
  localStorage.removeItem('debug-disable-merge')
  console.log('✅ Merge debugging enabled. Refresh the page to see detailed merge logs.')
}

export const disableMergeDebug = (): void => {
  localStorage.setItem('debug-disable-merge', 'true')
  console.log('🚫 Merge debugging disabled. Edit forms will use original data structure.')
}

// Check current debug status
export const checkDebugStatus = (): void => {
  const mergeDisabled = !!localStorage.getItem('debug-disable-merge')
  console.log('🔍 Current debug status:', {
    mergeDisabled,
    message: mergeDisabled 
      ? 'Merge is DISABLED - edit forms use original data' 
      : 'Merge is ENABLED - edit forms will attempt structure normalization'
  })
}

// Add to window for debugging in production
if (typeof window !== 'undefined') {
  (window as any).tempSaveDebug = {
    getStats: getTempSaveSystemStats,
    logStats: logTempSaveStats,
    stressTest: performTempSaveStressTest,
    clearAll: clearAllTempSaves,
    export: exportTempSaveSystemInfo,
    debugTabs: debugTabTracking,
    clearTabs: clearAllTabs,
    debugFormStructure: debugFormStructure,
    enableMerge: enableMergeDebug,
    disableMerge: disableMergeDebug,
    checkStatus: checkDebugStatus
  }
} 