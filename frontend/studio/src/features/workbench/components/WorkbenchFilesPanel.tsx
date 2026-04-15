import { Files } from 'lucide-react';
import { FileContentViewer } from '@/features/code-explorer';
import { useOptionalRemoteFileExplorer } from '../providers/RemoteFileExplorerProvider';
import { useWorkbenchLayout } from '../providers/WorkbenchLayoutProvider';
import { RemoteFileTabsBar } from './RemoteFileTabsBar';
import RemoteFileTree from './RemoteFileTree';
import { SidebarPanel } from './SidebarPanel';

export function WorkbenchFilesPanel() {
  const { closePanel, panelSize, setPanelSize, fileExplorerEnabled } = useWorkbenchLayout();
  const remoteExplorer = useOptionalRemoteFileExplorer();

  if (!fileExplorerEnabled) {
    return null;
  }

  return (
    <SidebarPanel
      icon={<Files className="h-4 w-4" />}
      title="Files"
      description="Browse and edit remote files."
      size={panelSize}
      onSizeChange={setPanelSize}
      onClose={closePanel}
    >
      {remoteExplorer ? (
        <div className="flex h-full">
          <div className="w-52 shrink-0 overflow-auto border-r bg-muted/40">
            <RemoteFileTree />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <RemoteFileTabsBar />
            <div className="flex-1 overflow-hidden p-3 pt-2">
              <FileContentViewer
                selectedFile={remoteExplorer.selectedFile}
                content={remoteExplorer.fileContent}
                isLoading={remoteExplorer.isContentLoading}
                className="h-full"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-muted-foreground text-sm">Remote file explorer is not available for this workspace.</p>
        </div>
      )}
    </SidebarPanel>
  );
}
