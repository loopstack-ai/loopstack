import { FileText } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
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
        <div className="border-b bg-muted/50 px-3 py-2 text-sm font-medium">
          {selectedFile.path ?? selectedFile.name}
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
        <div className="border-b bg-muted/50 px-3 py-2 text-sm font-medium">
          {selectedFile.path ?? selectedFile.name}
        </div>
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const language = getLanguageForFileName(selectedFile.name);

  return (
    <div className={cn('flex h-full flex-col overflow-hidden rounded-lg border bg-background', className)}>
      <div className="shrink-0 border-b bg-muted/50 px-3 py-2 text-sm font-medium">
        {selectedFile.path ?? selectedFile.name}
      </div>
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
    </div>
  );
}
