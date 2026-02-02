import { useCallback, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { CodeExplorerTree } from './components/CodeExplorerTree';
import { FileContentViewer } from './components/FileContentViewer';
import type { FileExplorerNode } from './types';

interface CodeExplorerProps {
  tree: FileExplorerNode[];
  fileContents?: Record<string, string>;
  onSelectFile?: (node: FileExplorerNode) => void;
  className?: string;
}

export function CodeExplorer({ tree, fileContents, onSelectFile, className }: CodeExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('files');
  const [selectedFile, setSelectedFile] = useState<FileExplorerNode | null>(null);

  const handleSelectFile = useCallback(
    (node: FileExplorerNode) => {
      setSelectedFile(node);
      onSelectFile?.(node);
    },
    [onSelectFile],
  );

  const content = selectedFile?.path ? (fileContents?.[selectedFile.path] ?? null) : null;

  return (
    <div className={cn('flex h-full w-full gap-4 overflow-hidden', className)}>
      <div className="flex w-72 shrink-0 flex-col overflow-hidden rounded-lg border bg-background text-foreground shadow-sm">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col overflow-hidden">
          <TabsList className="w-full shrink-0 rounded-none border-b bg-transparent p-0">
            <TabsTrigger
              value="files"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Files
            </TabsTrigger>
            <TabsTrigger
              value="search"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Search
            </TabsTrigger>
          </TabsList>

          <div className="border-b p-2">
            <Input
              type="search"
              placeholder="Search files"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8"
              aria-label="Search files"
            />
          </div>

          <TabsContent value="files" className="mt-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
            <div className="h-80">
              <CodeExplorerTree nodes={tree} searchQuery={searchQuery} onSelectFile={handleSelectFile} />
            </div>
          </TabsContent>
          <TabsContent value="search" className="mt-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
            <div className="h-80">
              <CodeExplorerTree nodes={tree} searchQuery={searchQuery} onSelectFile={handleSelectFile} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <FileContentViewer selectedFile={selectedFile} content={content} className="min-h-0" />
    </div>
  );
}
