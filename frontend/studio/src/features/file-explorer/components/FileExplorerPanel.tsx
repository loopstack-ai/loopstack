import { Files } from 'lucide-react';
import { FileContentViewer } from '@/features/code-explorer';
import { useWorkbenchLayout } from '@/features/workbench';
import { SidebarPanel } from '@/features/workbench/components/SidebarPanel';
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
  workspaceId?: string;
}

export function FileExplorerPanel({ workspaceId }: FileExplorerPanelProps) {
  const { closePanel, panelSize, setPanelSize, workspaceConfig, environments } = useWorkbenchLayout();

  const fileExplorerEnabled =
    (workspaceConfig?.features?.fileExplorer?.enabled &&
      workspaceConfig?.features?.fileExplorer?.environments?.includes(environments?.[0]?.slotId ?? '')) ??
    false;

  if (!fileExplorerEnabled) {
    return (
      <SidebarPanel
        icon={<Files className="h-4 w-4" />}
        title="Files"
        description="Browse remote files."
        size={panelSize}
        onSizeChange={setPanelSize}
        onClose={closePanel}
      >
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-muted-foreground text-sm">File explorer is not available for this environment.</p>
        </div>
      </SidebarPanel>
    );
  }

  return (
    <SidebarPanel
      icon={<Files className="h-4 w-4" />}
      title="Files"
      description="Browse and view files."
      size={panelSize}
      onSizeChange={setPanelSize}
      onClose={closePanel}
    >
      <FileExplorerProvider workspaceId={workspaceId} enabled={fileExplorerEnabled}>
        <FileExplorerContent />
      </FileExplorerProvider>
    </SidebarPanel>
  );
}
