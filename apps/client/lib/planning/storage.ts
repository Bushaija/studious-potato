const STORAGE_KEYS = {
    DRAFT_PREFIX: 'planning_draft_',
    AUTO_SAVE_PREFIX: 'planning_autosave_',
    LAST_ACTIVITY: 'planning_last_activity'
  } as const;
  
  export class PlanningStorage {
    static saveDraft(key: string, data: Record<string, any>): void {
      try {
        const storageKey = `${STORAGE_KEYS.DRAFT_PREFIX}${key}`;
        localStorage.setItem(storageKey, JSON.stringify({
          data,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.warn('Failed to save draft to localStorage:', error);
      }
    }
    
    static loadDraft(key: string): Record<string, any> | null {
      try {
        const storageKey = `${STORAGE_KEYS.DRAFT_PREFIX}${key}`;
        const stored = localStorage.getItem(storageKey);
        
        if (stored) {
          const parsed = JSON.parse(stored);
          // Check if draft is not too old (7 days)
          const age = Date.now() - new Date(parsed.timestamp).getTime();
          if (age < 7 * 24 * 60 * 60 * 1000) {
            return parsed.data;
          }
          // Remove old draft
          localStorage.removeItem(storageKey);
        }
      } catch (error) {
        console.warn('Failed to load draft from localStorage:', error);
      }
      
      return null;
    }
    
    static removeDraft(key: string): void {
      try {
        const storageKey = `${STORAGE_KEYS.DRAFT_PREFIX}${key}`;
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.warn('Failed to remove draft from localStorage:', error);
      }
    }
    
    static autoSave(key: string, data: Record<string, any>): void {
      try {
        const storageKey = `${STORAGE_KEYS.AUTO_SAVE_PREFIX}${key}`;
        localStorage.setItem(storageKey, JSON.stringify({
          data,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.warn('Failed to auto-save to localStorage:', error);
      }
    }
    
    static loadAutoSave(key: string): Record<string, any> | null {
      try {
        const storageKey = `${STORAGE_KEYS.AUTO_SAVE_PREFIX}${key}`;
        const stored = localStorage.getItem(storageKey);
        
        if (stored) {
          const parsed = JSON.parse(stored);
          // Auto-save is valid for 1 hour
          const age = Date.now() - new Date(parsed.timestamp).getTime();
          if (age < 60 * 60 * 1000) {
            return parsed.data;
          }
          localStorage.removeItem(storageKey);
        }
      } catch (error) {
        console.warn('Failed to load auto-save from localStorage:', error);
      }
      
      return null;
    }
    
    static trackActivity(): void {
      try {
        localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, new Date().toISOString());
      } catch (error) {
        console.warn('Failed to track activity:', error);
      }
    }
    
    static getLastActivity(): Date | null {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
        return stored ? new Date(stored) : null;
      } catch (error) {
        console.warn('Failed to get last activity:', error);
        return null;
      }
    }
    
    static clearAll(): void {
      try {
        Object.values(STORAGE_KEYS).forEach(keyPrefix => {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(keyPrefix)) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));
        });
      } catch (error) {
        console.warn('Failed to clear planning storage:', error);
      }
    }
  }