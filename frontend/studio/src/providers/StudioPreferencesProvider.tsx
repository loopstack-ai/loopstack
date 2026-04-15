import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { PanelId, PanelSize } from '../features/workbench/providers/WorkbenchLayoutProvider';

const STORAGE_KEY = 'loopstack:studio-preferences';

interface StudioPreferences {
  leftSidebarOpen: boolean;
  activePanel: PanelId | null;
  panelSizes: Partial<Record<PanelId, PanelSize>>;
}

const DEFAULTS: StudioPreferences = {
  leftSidebarOpen: false,
  activePanel: null,
  panelSizes: {},
};

interface StudioPreferencesContextType {
  preferences: StudioPreferences;
  setPreference: <K extends keyof StudioPreferences>(key: K, value: StudioPreferences[K]) => void;
}

const StudioPreferencesContext = createContext<StudioPreferencesContextType | null>(null);

function readFromStorage(): StudioPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULTS, ...JSON.parse(raw) } as StudioPreferences;
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULTS };
}

function writeToStorage(prefs: StudioPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota errors
  }
}

export function StudioPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<StudioPreferences>(readFromStorage);

  const setPreference = useCallback(<K extends keyof StudioPreferences>(key: K, value: StudioPreferences[K]) => {
    setPreferences((prev) => {
      const next = { ...prev, [key]: value };
      writeToStorage(next);
      return next;
    });
  }, []);

  const ctx = useMemo<StudioPreferencesContextType>(
    () => ({ preferences, setPreference }),
    [preferences, setPreference],
  );

  return <StudioPreferencesContext.Provider value={ctx}>{children}</StudioPreferencesContext.Provider>;
}

export function useStudioPreferences(): StudioPreferencesContextType {
  const ctx = useContext(StudioPreferencesContext);
  if (!ctx) {
    throw new Error('useStudioPreferences must be used within a StudioPreferencesProvider');
  }
  return ctx;
}

export function useOptionalStudioPreferences(): StudioPreferencesContextType | null {
  return useContext(StudioPreferencesContext);
}
