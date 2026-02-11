import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CodeExplorerTree } from './components/CodeExplorerTree';
import { FileContentViewer } from './components/FileContentViewer';
import { useCodeExplorer } from './hooks/useCodeExplorer';

interface CodeExplorerProps {
  pipelineId?: string;
  className?: string;
}

export function CodeExplorer({ pipelineId, className }: CodeExplorerProps) {
  const { fileTree, selectedFile, fileContent, isLoading, error, searchQuery, setSearchQuery, selectFile } =
    useCodeExplorer({ pipelineId });

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
        {error && (
          <div>
            <p className="text-xs text-destructive">Error: {error.message}</p>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <div
          className={cn(
            'flex min-h-0 flex-col overflow-hidden rounded-md border bg-background',
            selectedFile ? 'flex-[2]' : 'flex-1',
          )}
        >
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center p-4">
              <p className="text-xs text-muted-foreground">Loading file tree...</p>
            </div>
          ) : (
            <CodeExplorerTree
              nodes={fileTree}
              searchQuery={searchQuery}
              onSelectFile={selectFile}
              selectedFileId={selectedFile?.id}
            />
          )}
        </div>

        {selectedFile && (
          <div className="flex min-h-0 flex-[3] flex-col overflow-hidden rounded-md border bg-background">
            <FileContentViewer
              selectedFile={selectedFile}
              content={fileContent}
              isLoading={isLoading && selectedFile !== null}
              className="h-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}
