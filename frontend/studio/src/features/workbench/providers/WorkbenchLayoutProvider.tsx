import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { WorkflowFullInterface, WorkspaceEnvironmentInterface } from '@loopstack/contracts/api';
import { useWorkspaceEnvironments } from '@/hooks/useEnvironments';
import { useOptionalStudioPreferences } from '@/providers/StudioPreferencesProvider';

export type PanelId = 'runs' | 'preview' | 'files' | 'environment' | (string & {});
export type PanelSize = 'small' | 'medium' | 'large';

export interface WorkbenchLayoutContextType {
  workspaceId: string;
  workflow?: WorkflowFullInterface;
  previewPanelEnabled: boolean;

  getPreviewUrl?: (workflowId: string) => string;
  getEnvironmentPreviewUrl?: (env: WorkspaceEnvironmentInterface, workflowId?: string) => string;
  environments?: WorkspaceEnvironmentInterface[];

  // Panel state
  activePanel: PanelId | null;
  panelSize: PanelSize;
  togglePanel: (id: PanelId) => void;
  closePanel: () => void;
  setPanelSize: (size: PanelSize) => void;

  // Preview environment selection
  selectedSlotId: string;
  setSelectedSlotId: (slotId: string) => void;
  openPreviewWithEnvironment: (slotId: string) => void;

  // Active workflow section (for navigation highlight sync)
  activeSectionId: string | null;
  setActiveSectionId: (id: string | null) => void;
}

const WorkbenchLayoutContext = createContext<WorkbenchLayoutContextType | null>(null);

export interface WorkbenchLayoutProviderProps {
  children: ReactNode;
  workspaceId: string;
  workflow?: WorkflowFullInterface;

  getPreviewUrl?: (workflowId: string) => string;
  getEnvironmentPreviewUrl?: (env: WorkspaceEnvironmentInterface, workflowId?: string) => string;
}

export function WorkbenchLayoutProvider({
  children,
  workspaceId,
  workflow,

  getPreviewUrl,
  getEnvironmentPreviewUrl,
}: WorkbenchLayoutProviderProps) {
  const studioPrefs = useOptionalStudioPreferences();
  const { data: environments } = useWorkspaceEnvironments(workspaceId);

  // Panel state — backed by StudioPreferencesProvider when available, otherwise local state
  const [localActivePanel, setLocalActivePanel] = useState<PanelId | null>(null);
  const [localPanelSizes, setLocalPanelSizes] = useState<Partial<Record<PanelId, PanelSize>>>({});

  const activePanel = studioPrefs ? studioPrefs.preferences.activePanel : localActivePanel;
  const panelSizes = studioPrefs ? studioPrefs.preferences.panelSizes : localPanelSizes;

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');

  // Keep the active environment sensible: default to (and follow) a running slot. If the selected slot is
  // still running, leave the user's choice alone; otherwise switch to any running slot so environment-scoped
  // panels track the live container (e.g. init → claude → test in a sandbox run).
  useEffect(() => {
    if (!environments?.length) return;
    const current = environments.find((e) => e.slotId === selectedSlotId);
    if (current?.status === 'running') return;
    const running = environments.find((e) => e.status === 'running');
    setSelectedSlotId((running ?? current ?? environments[0]).slotId);
  }, [environments, selectedSlotId]);

  // Preview panel enabled when workspace has at least one connectable environment
  const hasConnectableEnvs =
    environments === undefined ||
    environments.some((e) => !!e.connectionUrl && (!!e.workerId || e.local) && e.status === 'running');
  const previewPanelEnabled = hasConnectableEnvs;
  const defaultPanelSize: Record<string, PanelSize> = {
    runs: 'medium',
    preview: 'medium',
    files: 'medium',
    environment: 'small',
  };

  const panelSize = activePanel ? (panelSizes[activePanel] ?? defaultPanelSize[activePanel] ?? 'small') : 'small';

  const setActivePanel = useCallback(
    (panel: PanelId | null) => {
      if (studioPrefs) {
        studioPrefs.setPreference('activePanel', panel);
      } else {
        setLocalActivePanel(panel);
      }
    },
    [studioPrefs],
  );

  const togglePanel = useCallback(
    (id: PanelId) => {
      const next = activePanel === id ? null : id;
      setActivePanel(next);
    },
    [activePanel, setActivePanel],
  );

  const closePanel = useCallback(() => {
    setActivePanel(null);
  }, [setActivePanel]);

  const setPanelSize = useCallback(
    (size: PanelSize) => {
      if (!activePanel) return;
      const next = { ...panelSizes, [activePanel]: size };
      if (studioPrefs) {
        studioPrefs.setPreference('panelSizes', next);
      } else {
        setLocalPanelSizes(next);
      }
    },
    [activePanel, panelSizes, studioPrefs],
  );

  const openPreviewWithEnvironment = useCallback(
    (slotId: string) => {
      setSelectedSlotId(slotId);
      setActivePanel('preview');
    },
    [setActivePanel],
  );

  const value = useMemo<WorkbenchLayoutContextType>(
    () => ({
      workspaceId,
      workflow,
      previewPanelEnabled,

      getPreviewUrl,
      getEnvironmentPreviewUrl,
      environments,

      activePanel,
      panelSize,
      togglePanel,
      closePanel,
      setPanelSize,

      selectedSlotId,
      setSelectedSlotId,
      openPreviewWithEnvironment,

      activeSectionId,
      setActiveSectionId,
    }),
    [
      workspaceId,
      workflow,
      previewPanelEnabled,

      getPreviewUrl,
      getEnvironmentPreviewUrl,
      environments,

      activePanel,
      panelSize,
      togglePanel,
      closePanel,
      setPanelSize,

      selectedSlotId,
      openPreviewWithEnvironment,

      activeSectionId,
      setActiveSectionId,
    ],
  );

  return <WorkbenchLayoutContext.Provider value={value}>{children}</WorkbenchLayoutContext.Provider>;
}

export function useWorkbenchLayout(): WorkbenchLayoutContextType {
  const ctx = useContext(WorkbenchLayoutContext);
  if (!ctx) {
    throw new Error('useWorkbenchLayout must be used within a WorkbenchLayoutProvider');
  }
  return ctx;
}

/** Layout context when hosted in the workbench, `null` elsewhere (e.g. the standalone run page). */
export function useOptionalWorkbenchLayout(): WorkbenchLayoutContextType | null {
  return useContext(WorkbenchLayoutContext);
}
