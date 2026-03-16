import { X } from 'lucide-react';
import { FileContentViewer } from '@/features/code-explorer';
import { useOptionalRemoteFileExplorer } from '../providers/RemoteFileExplorerProvider';
import { useWorkbenchLayout } from '../providers/WorkbenchLayoutProvider';
import { RemoteFileTabsBar } from './RemoteFileTabsBar';
import RemoteFileTree from './RemoteFileTree';

export function WorkbenchFilesPanel() {
  const { closeSidePanel, fileExplorerEnabled } = useWorkbenchLayout();
  const remoteExplorer = useOptionalRemoteFileExplorer();

  if (!fileExplorerEnabled) {
    return null;
  }

  return (
    <div className="border-l bg-background flex w-2/3 shrink-0 flex-col">
      <div className="border-b flex h-12 shrink-0 items-center justify-between px-3">
        <span className="text-sm font-medium">Files</span>
        <button
          onClick={closeSidePanel}
          className="text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {remoteExplorer ? (
          <>
            <div className="w-64 shrink-0 border-r bg-muted/40">
              <RemoteFileTree />
            </div>
            <div className="flex-1 flex flex-col min-w-0">
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-sm text-muted-foreground">Remote file explorer is not available for this workspace.</p>
          </div>
        )}
      </div>
    </div>
  );
}
