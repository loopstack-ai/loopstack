import type { ReactNode } from 'react';
import { RemoteFileExplorerProvider } from '../providers/RemoteFileExplorerProvider.tsx';
import type { PanelSize } from '../providers/WorkbenchLayoutProvider.tsx';
import { useWorkbenchLayout } from '../providers/WorkbenchLayoutProvider.tsx';
import { WorkbenchEnvironmentPanel } from './WorkbenchEnvironmentPanel.tsx';
import { WorkbenchFilesPanel } from './WorkbenchFilesPanel.tsx';
import { WorkbenchIconSidebar } from './WorkbenchIconSidebar.tsx';
import { WorkbenchPreviewPanel } from './WorkbenchPreviewPanel.tsx';
import { WorkbenchRunsPanel } from './WorkbenchRunsPanel.tsx';
import { WorkbenchSecretsPanel } from './WorkbenchSecretsPanel.tsx';

const PANEL_WIDTH: Record<PanelSize, string> = {
  small: 'w-80',
  medium: 'w-1/2',
  large: 'w-2/3',
};

const CONTENT_WIDTH: Record<PanelSize, string> = {
  small: 'w-full',
  medium: 'w-1/2',
  large: 'w-1/3',
};

function ActivePanelContent() {
  const { activePanel, workspaceId, environments } = useWorkbenchLayout();

  switch (activePanel) {
    case 'runs':
      return <WorkbenchRunsPanel />;
    case 'preview':
      return <WorkbenchPreviewPanel />;
    case 'files':
      return <WorkbenchFilesPanel />;
    case 'secrets':
      return <WorkbenchSecretsPanel workspaceId={workspaceId} />;
    case 'environment':
      return <WorkbenchEnvironmentPanel workspaceId={workspaceId} environments={environments} />;
    default:
      return null;
  }
}

function SidebarContent({ children }: { children: ReactNode }) {
  const { activePanel, panelSize } = useWorkbenchLayout();

  return (
    <div className="flex h-full w-full">
      <div className="flex flex-1 overflow-hidden">
        <div className={`${activePanel ? CONTENT_WIDTH[panelSize] : 'w-full'} overflow-hidden`}>{children}</div>
        {activePanel && (
          <div className={`${PANEL_WIDTH[panelSize]} shrink-0 overflow-hidden`}>
            <ActivePanelContent />
          </div>
        )}
      </div>
      <WorkbenchIconSidebar />
    </div>
  );
}

export function WorkbenchSidebarShell({ children }: { children: ReactNode }) {
  const { fileExplorerEnabled } = useWorkbenchLayout();

  if (fileExplorerEnabled) {
    return (
      <RemoteFileExplorerProvider>
        <SidebarContent>{children}</SidebarContent>
      </RemoteFileExplorerProvider>
    );
  }

  return <SidebarContent>{children}</SidebarContent>;
}
