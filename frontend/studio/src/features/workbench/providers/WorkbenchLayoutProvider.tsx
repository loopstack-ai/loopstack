import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { PipelineInterface, WorkspaceEnvironmentInterface, WorkspaceInterface } from '@loopstack/contracts/api';

export type FloatingPanelId = 'navigation' | 'history';
export type SidePanelId = 'preview' | 'flow';
export type PreviewTab = 'preview' | 'flow' | 'history';

export interface WorkbenchLayoutContextType {
  // Pipeline & derived state
  pipeline: PipelineInterface;
  previewPanelEnabled: boolean;
  isDeveloperMode: boolean;
  workspaceConfig?: Pick<WorkspaceInterface, 'volumes' | 'features'>;

  getPreviewUrl?: (pipelineId: string) => string;
  getEnvironmentPreviewUrl?: (env: WorkspaceEnvironmentInterface, pipelineId?: string) => string;
  environments?: WorkspaceEnvironmentInterface[];

  // Floating panel state (navigation, history)
  activeFloatingPanel: FloatingPanelId | null;
  toggleFloatingPanel: (id: FloatingPanelId) => void;
  closeFloatingPanel: () => void;

  // Side panel state (preview, flow — takes half width)
  activeSidePanel: SidePanelId | null;
  toggleSidePanel: (id: SidePanelId) => void;
  closeSidePanel: () => void;

  // Preview environment selection
  selectedSlotId: string;
  setSelectedSlotId: (slotId: string) => void;
  openPreviewWithEnvironment: (slotId: string) => void;

  // Legacy aliases
  previewPanelOpen: boolean;
  togglePreviewPanel: () => void;
  activePreviewTab: PreviewTab;
  setActivePreviewTab: (tab: PreviewTab) => void;

  // Active workflow section (for navigation highlight sync)
  activeSectionId: string | null;
  setActiveSectionId: (id: string | null) => void;
}

const WorkbenchLayoutContext = createContext<WorkbenchLayoutContextType | null>(null);

export interface WorkbenchLayoutProviderProps {
  children: ReactNode;
  pipeline: PipelineInterface;
  isDeveloperMode?: boolean;
  workspaceConfig?: Pick<WorkspaceInterface, 'volumes' | 'features'>;

  getPreviewUrl?: (pipelineId: string) => string;
  getEnvironmentPreviewUrl?: (env: WorkspaceEnvironmentInterface, pipelineId?: string) => string;
  environments?: WorkspaceEnvironmentInterface[];
  previewPanelOpen?: boolean;
  onPreviewPanelOpenChange?: (open: boolean) => void;
}

export function WorkbenchLayoutProvider({
  children,
  pipeline,
  isDeveloperMode = false,
  workspaceConfig,

  getPreviewUrl,
  getEnvironmentPreviewUrl,
  environments,
  previewPanelOpen: controlledPreviewOpen,
  onPreviewPanelOpenChange,
}: WorkbenchLayoutProviderProps) {
  const [activeFloatingPanel, setActiveFloatingPanel] = useState<FloatingPanelId | null>(null);
  const [uncontrolledSidePanel, setUncontrolledSidePanel] = useState<SidePanelId | null>(null);
  const [activePreviewTab, setActivePreviewTab] = useState<PreviewTab>('preview');
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');

  const isControlled = controlledPreviewOpen !== undefined;
  const activeSidePanel: SidePanelId | null = isControlled
    ? controlledPreviewOpen
      ? (uncontrolledSidePanel ?? 'preview')
      : null
    : uncontrolledSidePanel;

  const featureEnabled = workspaceConfig?.features?.previewPanel?.enabled ?? false;
  const hasConnectableEnvs =
    environments === undefined || environments.some((e) => !!e.connectionUrl && (!!e.workerId || e.local));
  const previewPanelEnabled = featureEnabled && hasConnectableEnvs;
  const previewPanelOpen = activeSidePanel !== null;

  const setSidePanel = useCallback(
    (panel: SidePanelId | null) => {
      if (isControlled) {
        onPreviewPanelOpenChange?.(panel !== null);
      }
      setUncontrolledSidePanel(panel);
    },
    [isControlled, onPreviewPanelOpenChange],
  );

  const toggleFloatingPanel = useCallback(
    (id: FloatingPanelId) => {
      setActiveFloatingPanel((prev) => (prev === id ? null : id));
      // Close side panel when opening a floating panel
      setSidePanel(null);
    },
    [setSidePanel],
  );

  const closeFloatingPanel = useCallback(() => {
    setActiveFloatingPanel(null);
  }, []);

  const toggleSidePanel = useCallback(
    (id: SidePanelId) => {
      const next = activeSidePanel === id ? null : id;
      setSidePanel(next);
      // Close floating panel when opening a side panel
      if (next) {
        setActiveFloatingPanel(null);
      }
    },
    [activeSidePanel, setSidePanel],
  );

  const closeSidePanel = useCallback(() => {
    setSidePanel(null);
  }, [setSidePanel]);

  const openPreviewWithEnvironment = useCallback(
    (slotId: string) => {
      setSelectedSlotId(slotId);
      setSidePanel('preview');
      setActiveFloatingPanel(null);
    },
    [setSidePanel],
  );

  const togglePreviewPanel = useCallback(() => {
    toggleSidePanel('preview');
  }, [toggleSidePanel]);

  const value = useMemo<WorkbenchLayoutContextType>(
    () => ({
      pipeline,
      previewPanelEnabled,
      isDeveloperMode,
      workspaceConfig,

      getPreviewUrl,
      getEnvironmentPreviewUrl,
      environments,
      activeFloatingPanel,
      toggleFloatingPanel,
      closeFloatingPanel,
      activeSidePanel,
      toggleSidePanel,
      closeSidePanel,
      selectedSlotId,
      setSelectedSlotId,
      openPreviewWithEnvironment,
      previewPanelOpen,
      togglePreviewPanel,
      activePreviewTab,
      setActivePreviewTab,
      activeSectionId,
      setActiveSectionId,
    }),
    [
      pipeline,
      previewPanelEnabled,
      isDeveloperMode,
      workspaceConfig,

      getPreviewUrl,
      getEnvironmentPreviewUrl,
      environments,
      activeFloatingPanel,
      toggleFloatingPanel,
      closeFloatingPanel,
      activeSidePanel,
      toggleSidePanel,
      closeSidePanel,
      selectedSlotId,
      openPreviewWithEnvironment,
      previewPanelOpen,
      togglePreviewPanel,
      activePreviewTab,
      setActivePreviewTab,
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
