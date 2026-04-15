import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CodeExplorerTreeNode } from '@/features/code-explorer/components/CodeExplorerTreeNode';
import { useFileExplorer } from '../providers/FileExplorerProvider';

export function FileTree() {
  const {
    nodes,
    isTreeLoading,
    treeError,
    isFetchingTree,
    expandedFolders,
    toggleFolder,
    selectFile,
    closeFile,
    selectedFile,
    refreshTree,
  } = useFileExplorer();

  if (isTreeLoading) {
    return (
      <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading file tree…
      </div>
    );
  }

  if (treeError) {
    return (
      <div className="space-y-2 p-3">
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{treeError instanceof Error ? treeError.message : String(treeError)}</span>
        </div>
        <Button variant="outline" size="sm" onClick={refreshTree}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  if (nodes.length === 0) {
    return <p className="px-2 py-4 text-sm text-muted-foreground">No files found</p>;
  }

  return (
    <div className="flex h-full flex-col gap-1.5">
      <div className="flex items-center justify-end px-1">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={refreshTree} disabled={isFetchingTree}>
          <RefreshCw className={`h-3 w-3 ${isFetchingTree ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <ScrollArea className="h-full w-full">
        <div className="w-full py-1" role="tree" aria-label="File tree">
          {nodes.map((node) => (
            <CodeExplorerTreeNode
              key={node.id}
              node={node}
              depth={0}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              onSelectFile={selectFile}
              onCloseFile={closeFile}
              selectedFileId={selectedFile?.id}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
