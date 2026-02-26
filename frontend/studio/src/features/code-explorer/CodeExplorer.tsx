import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CodeExplorerTree } from './components/CodeExplorerTree';
import { useCodeExplorerContext } from './providers/CodeExplorerProvider';

interface CodeExplorerProps {
  className?: string;
}

export function CodeExplorer({ className }: CodeExplorerProps) {
  const {
    fileTree,
    isTreeLoading,
    error,
    searchQuery,
    setSearchQuery,
    selectFile,
    selectedFile,
    clearSelection,
    closeFile,
  } = useCodeExplorerContext();

  return (
    <div className={cn('flex h-full w-full flex-col gap-2 overflow-hidden', className)}>
      <div className="flex shrink-0 flex-col gap-2">
        <Input
          type="search"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 w-full"
          aria-label="Search files"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border bg-background">
          {error ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <div className="rounded-lg border border-destructive bg-destructive/10 p-4 max-w-md">
                <p className="text-sm font-semibold text-destructive mb-2">File Explorer Error</p>
                <p className="text-xs text-destructive/90">{error.message}</p>
              </div>
            </div>
          ) : isTreeLoading ? (
            <div className="flex flex-1 items-center justify-center p-4">
              <p className="text-xs text-muted-foreground">Loading file tree...</p>
            </div>
          ) : fileTree.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-4">
              <p className="text-xs text-muted-foreground">No files found</p>
            </div>
          ) : (
            <CodeExplorerTree
              nodes={fileTree}
              searchQuery={searchQuery}
              onSelectFile={selectFile}
              onClearSelection={clearSelection}
              onCloseFile={closeFile}
              selectedFileId={selectedFile?.id}
            />
          )}
        </div>
      </div>
    </div>
  );
}
