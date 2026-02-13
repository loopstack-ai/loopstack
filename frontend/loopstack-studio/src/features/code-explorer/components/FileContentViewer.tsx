import { ReactFlowProvider } from '@xyflow/react';
import { FileText, Loader2, X } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import MarkdownContent from '@/components/dynamic-form/MarkdownContent';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ConfigFlowViewer from '@/features/debug/components/ConfigFlowViewer';
import { cn } from '@/lib/utils';
import { useCodeExplorerContext } from '../providers/CodeExplorerProvider';
import type { FileExplorerNode } from '../types';

const BINARY_EXTENSIONS = new Set([
  '.ico',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.bin',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
]);

function isBinaryFileName(name: string): boolean {
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : '';
  return BINARY_EXTENSIONS.has(ext);
}

const EXTENSION_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.json': 'json',
  '.jsonc': 'json',
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',
  '.html': 'html',
  '.htm': 'html',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  '.fish': 'bash',
  '.txt': 'plaintext',
  '.log': 'plaintext',
  '.env': 'plaintext',
  '.gitignore': 'plaintext',
  '.dockerfile': 'dockerfile',
  '.dockerignore': 'plaintext',
};

function getLanguageForFileName(name: string): string {
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : '';
  return EXTENSION_LANGUAGE[ext] ?? 'plaintext';
}

interface FileContentViewerProps {
  selectedFile: FileExplorerNode | null;
  content: string | null;
  isLoading?: boolean;
  className?: string;
}

export function FileContentViewer({ selectedFile, content, isLoading = false, className }: FileContentViewerProps) {
  const { clearSelection, workflowConfig } = useCodeExplorerContext();

  if (!selectedFile) {
    return (
      <div
        className={cn(
          'flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-8 text-center',
          className,
        )}
      >
        <FileText className="mb-4 h-12 w-12 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">Select a file to view its content</p>
      </div>
    );
  }

  const isBinary = isBinaryFileName(selectedFile.name);
  const displayContent =
    content ?? (isBinary ? null : `// ${selectedFile.path ?? selectedFile.name}\n\n(No content available)`);

  if (isBinary && content == null) {
    return (
      <div className={cn('flex flex-1 flex-col rounded-lg border bg-background', className)}>
        <div className="border-b bg-muted/50 px-3 py-2 text-sm font-medium flex items-center justify-between">
          <span className="truncate flex-1">{selectedFile.path ?? selectedFile.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 ml-2 opacity-70 hover:opacity-100"
            onClick={clearSelection}
            aria-label="Close file"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-sm text-muted-foreground">Binary file — preview not available</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn('flex flex-1 flex-col rounded-lg border bg-background', className)}>
        <div className="border-b bg-muted/50 px-3 py-2 text-sm font-medium flex items-center justify-between">
          <span className="truncate flex-1">{selectedFile.path ?? selectedFile.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 ml-2 opacity-70 hover:opacity-100"
            onClick={clearSelection}
            aria-label="Close file"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const language = getLanguageForFileName(selectedFile.name);
  const isMarkdown = language === 'markdown' || selectedFile.name.endsWith('.md') || selectedFile.name.endsWith('.mdx');
  const isYaml = language === 'yaml' || selectedFile.name.endsWith('.yaml') || selectedFile.name.endsWith('.yml');
  const isYamlWorkflow = isYaml && workflowConfig !== null;

  return (
    <div className={cn('flex h-full flex-col overflow-hidden rounded-lg border bg-background', className)}>
      <div className="shrink-0 border-b bg-muted/50 px-3 py-2 text-sm font-medium flex items-center justify-between">
        <span className="truncate flex-1">{selectedFile.path ?? selectedFile.name}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 ml-2 opacity-70 hover:opacity-100"
          onClick={clearSelection}
          aria-label="Close file"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {isMarkdown && displayContent ? (
        <Tabs defaultValue="rendered" className="flex h-full flex-col overflow-hidden">
          <TabsList className="shrink-0 mx-2 mt-2">
            <TabsTrigger value="rendered">Rendered</TabsTrigger>
            <TabsTrigger value="unrendered">Unrendered</TabsTrigger>
          </TabsList>
          <TabsContent value="rendered" className="flex-1 min-h-0 overflow-hidden mt-2">
            <ScrollArea className="h-full">
              <div className="p-4">
                <MarkdownContent content={displayContent} />
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="unrendered" className="flex-1 min-h-0 overflow-hidden mt-0">
            <ScrollArea className="flex-1 min-h-0">
              <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                customStyle={{ margin: 0, padding: '1rem', fontSize: '13px' }}
                showLineNumbers
                PreTag="div"
                codeTagProps={{ style: { fontFamily: 'inherit' } }}
              >
                {displayContent ?? ''}
              </SyntaxHighlighter>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      ) : isYamlWorkflow && workflowConfig ? (
        <Tabs defaultValue="code" className="flex h-full flex-col overflow-hidden">
          <TabsList className="shrink-0 mx-2 mt-2">
            <TabsTrigger value="code">Code</TabsTrigger>
            <TabsTrigger value="flow">Flow Diagram</TabsTrigger>
          </TabsList>
          <TabsContent value="code" className="flex-1 min-h-0 overflow-hidden mt-0">
            <ScrollArea className="flex-1 min-h-0">
              <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                customStyle={{ margin: 0, padding: '1rem', fontSize: '13px' }}
                showLineNumbers
                PreTag="div"
                codeTagProps={{ style: { fontFamily: 'inherit' } }}
              >
                {displayContent ?? ''}
              </SyntaxHighlighter>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="flow" className="flex-1 min-h-0 overflow-hidden mt-0">
            <div className="h-full w-full">
              <ReactFlowProvider>
                <ConfigFlowViewer config={workflowConfig} />
              </ReactFlowProvider>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            customStyle={{ margin: 0, padding: '1rem', fontSize: '13px' }}
            showLineNumbers
            PreTag="div"
            codeTagProps={{ style: { fontFamily: 'inherit' } }}
          >
            {displayContent ?? ''}
          </SyntaxHighlighter>
        </ScrollArea>
      )}
    </div>
  );
}
