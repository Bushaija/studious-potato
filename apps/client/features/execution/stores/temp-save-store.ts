import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { FinancialRow } from '@/features/execution/schemas/execution-form-schema'
import { ExecutionFormMode } from '@/features/execution/components/execution-form'

// Types for temporary save data
export interface TempSaveMetadata {
  facilityId: number | null
  facilityName: string
  reportingPeriod: string
  programName: string
  fiscalYear: string
  mode: ExecutionFormMode
  district?: string
  facilityType: string
}

export interface TempSaveData {
  id: string // Unique identifier for this save (facilityId + reportingPeriod + programName)
  formData: FinancialRow[]
  formValues: Record<string, any> // React Hook Form field values
  expandedRows: string[] // UI state for expanded rows
  metadata: TempSaveMetadata
  timestamps: {
    created: string
    lastSaved: string
    lastAccessed: string
  }
  version: string // For handling form structure changes
}

export interface TempSaveState {
  // Store multiple saves (different facilities/periods)
  saves: Record<string, TempSaveData>
  
  // Auto-save settings
  autoSaveEnabled: boolean
  autoSaveInterval: number // in milliseconds
  
  // Actions
  saveTemporary: (
    id: string,
    formData: FinancialRow[],
    formValues: Record<string, any>,
    expandedRows: string[],
    metadata: TempSaveMetadata
  ) => void
  
  restoreTemporary: (id: string) => TempSaveData | null
  
  removeTemporary: (id: string) => void
  
  clearAllTemporary: () => void
  
  clearExpiredSaves: (maxAgeInDays?: number) => number
  
  updateLastAccessed: (id: string) => void
  
  performMaintenance: () => { expired: number; totalCleaned: number }
  
  getAllSaves: () => TempSaveData[]
  
  getSaveById: (id: string) => TempSaveData | null
  
  getSavesForFacility: (facilityId: number) => TempSaveData[]
  
  setAutoSaveEnabled: (enabled: boolean) => void
  
  setAutoSaveInterval: (interval: number) => void
}

// Helper function to generate unique save ID
export const generateSaveId = (metadata: TempSaveMetadata): string => {
  return `${metadata.facilityId}_${metadata.reportingPeriod}_${metadata.programName}_${metadata.mode}`.replace(/\s+/g, '_')
}

// Helper function to check if a save is expired
const isSaveExpired = (save: TempSaveData, maxAgeInDays: number = 7): boolean => {
  const ageInMs = Date.now() - new Date(save.timestamps.lastAccessed).getTime()
  const maxAgeInMs = maxAgeInDays * 24 * 60 * 60 * 1000
  return ageInMs > maxAgeInMs
}

// Current version for form structure compatibility
const CURRENT_VERSION = '1.0.0'

export const useTempSaveStore = create<TempSaveState>()(
  persist(
    (set, get) => ({
      saves: {},
      autoSaveEnabled: true,
      autoSaveInterval: 60000, // 1 minute default
      
      saveTemporary: (id, formData, formValues, expandedRows, metadata) => {
        try {
          const now = new Date().toISOString()
          const existingSave = get().saves[id]
          
          const saveData: TempSaveData = {
            id,
            formData,
            formValues,
            expandedRows,
            metadata,
            timestamps: {
              created: existingSave?.timestamps.created || now,
              lastSaved: now,
              lastAccessed: now,
            },
            version: CURRENT_VERSION,
          }
          
          // Check localStorage quota before saving
          const saveSize = JSON.stringify(saveData).length
          if (saveSize > 4000000) { // 4MB warning (localStorage limit is ~5-10MB)
            console.warn('Save data is very large:', saveSize, 'bytes')
          }
          
          set(state => ({
            saves: {
              ...state.saves,
              [id]: saveData,
            },
          }))
        } catch (error: any) {
          console.error('Failed to save temporary data:', error)
          
          // If localStorage is full, try to clear some space
          if (error?.name === 'QuotaExceededError' || error?.message?.includes('quota')) {
            console.log('Storage quota exceeded, attempting cleanup...')
            const cleaned = get().clearExpiredSaves(1) // Clear saves older than 1 day
            
            if (cleaned > 0) {
              console.log(`Cleaned ${cleaned} saves, retrying...`)
              // Retry the save after cleanup
              try {
                const now = new Date().toISOString()
                const existingSave = get().saves[id]
                
                const saveData: TempSaveData = {
                  id,
                  formData,
                  formValues,
                  expandedRows,
                  metadata,
                  timestamps: {
                    created: existingSave?.timestamps.created || now,
                    lastSaved: now,
                    lastAccessed: now,
                  },
                  version: CURRENT_VERSION,
                }
                
                set(state => ({
                  saves: {
                    ...state.saves,
                    [id]: saveData,
                  },
                }))
              } catch (retryError) {
                console.error('Retry save also failed:', retryError)
                throw retryError
              }
            } else {
              throw error // Re-throw if cleanup didn't help
            }
          } else {
            throw error // Re-throw for other types of errors
          }
        }
      },
      
      restoreTemporary: (id) => {
        const save = get().saves[id]
        if (!save) return null
        
        // Update last accessed time
        get().updateLastAccessed(id)
        
        // Check version compatibility
        if (save.version !== CURRENT_VERSION) {
          console.warn(`Temporary save version mismatch. Saved: ${save.version}, Current: ${CURRENT_VERSION}`)
          // You could implement migration logic here if needed
        }
        
        return save
      },
      
      removeTemporary: (id) => {
        set(state => {
          const newSaves = { ...state.saves }
          delete newSaves[id]
          return { saves: newSaves }
        })
      },
      
      clearAllTemporary: () => {
        set({ saves: {} })
      },
      
      clearExpiredSaves: (maxAgeInDays = 7) => {
        let expiredCount = 0
        
        set(state => {
          const newSaves: Record<string, TempSaveData> = {}
          
          Object.values(state.saves).forEach(save => {
            if (!isSaveExpired(save, maxAgeInDays)) {
              newSaves[save.id] = save
            } else {
              expiredCount++
            }
          })
          
          return { saves: newSaves }
        })
        
        return expiredCount
      },
      
      updateLastAccessed: (id) => {
        const save = get().saves[id]
        if (save) {
          set(state => ({
            saves: {
              ...state.saves,
              [id]: {
                ...save,
                timestamps: {
                  ...save.timestamps,
                  lastAccessed: new Date().toISOString(),
                },
              },
            },
          }))
        }
      },
      
      getAllSaves: () => {
        return Object.values(get().saves)
      },
      
      getSaveById: (id) => {
        return get().saves[id] || null
      },
      
      getSavesForFacility: (facilityId) => {
        return Object.values(get().saves).filter(
          save => save.metadata.facilityId === facilityId
        )
      },
      
      setAutoSaveEnabled: (enabled) => {
        set({ autoSaveEnabled: enabled })
      },
      
      setAutoSaveInterval: (interval) => {
        set({ autoSaveInterval: interval })
      },
      
      performMaintenance: () => {
        const expiredCount = get().clearExpiredSaves(7) // Clear saves older than 7 days
        
        // Additional maintenance: Clear saves with invalid structure
        let structureCleaned = 0
        const currentSaves = get().saves
        const validSaves: Record<string, TempSaveData> = {}
        
        Object.values(currentSaves).forEach(save => {
          // Validate save structure
          if (save.formData && Array.isArray(save.formData) && 
              save.metadata && save.timestamps && save.version) {
            validSaves[save.id] = save
          } else {
            structureCleaned++
          }
        })
        
        if (structureCleaned > 0) {
          set({ saves: validSaves })
        }
        
        return {
          expired: expiredCount,
          totalCleaned: expiredCount + structureCleaned
        }
      },
    }),
    {
      name: 'execution-form-temp-saves', // Storage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        saves: state.saves,
        autoSaveEnabled: state.autoSaveEnabled,
        autoSaveInterval: state.autoSaveInterval,
      }),
      // Auto-cleanup expired saves on load
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.clearExpiredSaves()
        }
      },
    }
  )
)

// Custom hook for easier usage with specific form context
export const useTempSaveForForm = (metadata: TempSaveMetadata | null) => {
  const store = useTempSaveStore()
  
  if (!metadata) {
    return {
      saveId: null,
      save: null,
      saveTemporary: () => {},
      restoreTemporary: () => null,
      removeTemporary: () => {},
      hasSave: false,
    }
  }
  
  const saveId = generateSaveId(metadata)
  const existingSave = store.getSaveById(saveId)
  
  return {
    saveId,
    save: existingSave,
    saveTemporary: (formData: FinancialRow[], formValues: Record<string, any>, expandedRows: string[]) => {
      store.saveTemporary(saveId, formData, formValues, expandedRows, metadata)
    },
    restoreTemporary: () => store.restoreTemporary(saveId),
    removeTemporary: () => store.removeTemporary(saveId),
    hasSave: !!existingSave,
    lastSaved: existingSave?.timestamps.lastSaved,
  }
} 