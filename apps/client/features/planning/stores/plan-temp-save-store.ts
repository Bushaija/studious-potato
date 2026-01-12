import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface PlanTempSaveMetadata {
  facilityName: string;
  facilityType?: string;
  programName?: string;
  // Additional identifiers (e.g. period or year) can be appended when available
}

export interface PlanTempSaveData {
  id: string;
  planData: any; // Plan form values (program-specific)
  metadata: PlanTempSaveMetadata;
  timestamps: {
    created: string;
    lastSaved: string;
    lastAccessed: string;
  };
  version: string;
}

export interface PlanTempSaveState {
  saves: Record<string, PlanTempSaveData>;
  saveTemporary: (
    id: string,
    planData: any,
    metadata: PlanTempSaveMetadata
  ) => void;
  restoreTemporary: (id: string) => PlanTempSaveData | null;
  removeTemporary: (id: string) => void;
  getSaveById: (id: string) => PlanTempSaveData | null;
  hasSave: (id: string) => boolean;
}

const CURRENT_VERSION = '1.0.0';

const generateSaveId = (metadata: PlanTempSaveMetadata): string => {
  // Basic composite key. Refine when more identifiers exist.
  return `${metadata.facilityName || 'unknown'}_${metadata.programName || 'program'}`.replace(/\s+/g, '_').toLowerCase();
};

export const usePlanTempSaveStore = create<PlanTempSaveState>()(
  persist(
    (set, get) => ({
      saves: {},
      saveTemporary: (id, planData, metadata) => {
        const now = new Date().toISOString();
        const existing = get().saves[id];
        const saveData: PlanTempSaveData = {
          id,
          planData,
          metadata,
          timestamps: {
            created: existing?.timestamps.created || now,
            lastSaved: now,
            lastAccessed: now,
          },
          version: CURRENT_VERSION,
        };
        set((state) => ({
          saves: {
            ...state.saves,
            [id]: saveData,
          },
        }));
      },
      restoreTemporary: (id) => {
        const save = get().saves[id];
        if (!save) return null;
        // Touch last accessed
        set((state) => ({
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
        }));
        return save;
      },
      removeTemporary: (id) => {
        set((state) => {
          const newSaves = { ...state.saves };
          delete newSaves[id];
          return { saves: newSaves };
        });
      },
      getSaveById: (id) => get().saves[id] || null,
      hasSave: (id) => !!get().saves[id],
    }),
    {
      name: 'plan-form-temp-saves',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ saves: state.saves }),
    }
  )
);

// Convenience hook tailored for PlanForm
export const useTempSaveForPlanForm = (metadata: PlanTempSaveMetadata | null) => {
  const store = usePlanTempSaveStore();
  if (!metadata) {
    return {
      saveId: null,
      save: null,
      saveTemporary: (_data: any) => {},
      restoreTemporary: () => null,
      removeTemporary: () => {},
      hasSave: false,
      lastSaved: undefined,
    } as const;
  }
  const saveId = generateSaveId(metadata);
  const existingSave = store.getSaveById(saveId);
  return {
    saveId,
    save: existingSave,
    saveTemporary: (planData: any) => store.saveTemporary(saveId, planData, metadata),
    restoreTemporary: () => store.restoreTemporary(saveId),
    removeTemporary: () => store.removeTemporary(saveId),
    hasSave: !!existingSave,
    lastSaved: existingSave?.timestamps.lastSaved,
  } as const;
}; 