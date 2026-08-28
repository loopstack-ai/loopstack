import { Files } from 'lucide-react';
import { FileContentViewer } from '@/features/code-explorer';
import { useFeatureConfig } from '@/features/feature-registry';
import { useWorkbenchLayout } from '@/features/workbench';
import { EnvironmentSelector } from '@/features/workbench/components/EnvironmentSelector';
import { SidebarPanel } from '@/features/workbench/components/SidebarPanel';
import type { FileExplorerVariant } from '../hooks/useFileExplorer';
import { FileExplorerProvider, useOptionalFileExplorer } from '../providers/FileExplorerProvider';
import { FileTabsBar } from './FileTabsBar';
import { FileTree } from './FileTree';

function FileExplorerContent() {
  const explorer = useOptionalFileExplorer();

  if (!explorer) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-muted-foreground text-sm">File explorer is not available for this workspace.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-52 shrink-0 overflow-auto border-r bg-muted/40">
        <FileTree />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <FileTabsBar />
        <div className="flex-1 overflow-hidden p-3 pt-2">
          <FileContentViewer
            selectedFile={explorer.selectedFile}
            content={explorer.fileContent}
            isLoading={explorer.isContentLoading}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}

interface FileExplorerPanelProps {
  variant: FileExplorerVariant;
  featureId: string;
  title: string;
  description: string;
  workspaceId?: string;
}

function FileExplorerPanel({ variant, featureId, title, description, workspaceId }: FileExplorerPanelProps) {
  const { closePanel, panelSize, setPanelSize, environments, selectedSlotId } = useWorkbenchLayout();
  const featureConfig = useFeatureConfig(featureId);

  const allowedEnvironments = (featureConfig?.config?.environments as string[] | undefined) ?? [];
  const selectedEnv = environments?.find((e) => e.slotId === selectedSlotId);
  const allowed = allowedEnvironments.length === 0 || allowedEnvironments.includes(selectedSlotId);
  // No env record (e.g. the local variant) → nothing to gate on; otherwise require the slot to be running.
  const running = !selectedEnv || selectedEnv.status === 'running';
  const enabled = allowed && running;

  return (
    <SidebarPanel
      icon={<Files className="h-4 w-4" />}
      title={title}
      description={description}
      size={panelSize}
      onSizeChange={setPanelSize}
      onClose={closePanel}
    >
      <EnvironmentSelector />
      {!allowed ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-muted-foreground text-sm">File explorer is not available for this environment.</p>
        </div>
      ) : !running ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-muted-foreground text-sm">This environment is not available (stopped).</p>
        </div>
      ) : (
        <FileExplorerProvider
          variant={variant}
          workspaceId={workspaceId}
          slotId={selectedSlotId || undefined}
          enabled={enabled}
        >
          <FileExplorerContent />
        </FileExplorerProvider>
      )}
    </SidebarPanel>
  );
}

export function LocalFileExplorerPanel({ workspaceId }: { workspaceId?: string }) {
  return (
    <FileExplorerPanel
      variant="local"
      featureId="localFileExplorer"
      title="Files"
      description="Browse and view local project files."
      workspaceId={workspaceId}
    />
  );
}

export function RemoteFileExplorerPanel({ workspaceId }: { workspaceId?: string }) {
  return (
    <FileExplorerPanel
      variant="remote"
      featureId="remoteFileExplorer"
      title="Remote Files"
      description="Browse and view files on the remote workspace."
      workspaceId={workspaceId}
    />
  );
}
