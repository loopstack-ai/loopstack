import { ClipboardCopy, MoreHorizontal, X, XCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useCodeExplorerContext } from '../providers/CodeExplorerProvider';
import type { FileExplorerNode } from '../types';
import { getFileIcon } from '../utils/fileIcons';

export function FileTabsBar() {
  const { openFiles, selectedFile, selectFile, closeFile, closeAll, closeOthers, closeToLeft, closeToRight } =
    useCodeExplorerContext();
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const previousOpenFilesLengthRef = useRef(openFiles.length);

  useEffect(() => {
    if (openFiles.length > previousOpenFilesLengthRef.current && tabsContainerRef.current) {
      const container = tabsContainerRef.current;
      const viewport = container.closest('[data-slot="scroll-area-viewport"]') as HTMLElement;
      if (viewport) {
        requestAnimationFrame(() => {
          viewport.scrollTo({ left: viewport.scrollWidth, behavior: 'smooth' });
        });
      }
    }
    previousOpenFilesLengthRef.current = openFiles.length;
  }, [openFiles.length]);

  useEffect(() => {
    if (selectedFile && tabsContainerRef.current) {
      const activeTab = tabsContainerRef.current.querySelector(`[data-tab-path="${selectedFile.path}"]`) as HTMLElement;
      if (activeTab) {
        requestAnimationFrame(() => {
          activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        });
      }
    }
  }, [selectedFile]);

  if (openFiles.length === 0) {
    return null;
  }

  const handleTabClick = (file: FileExplorerNode) => {
    selectFile(file);
  };

  const handleCloseClick = (e: React.MouseEvent, file: FileExplorerNode) => {
    e.stopPropagation();
    closeFile(file);
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path).catch((err) => {
      console.error('Failed to copy path:', err);
    });
  };

  return (
    <div className="shrink-0 border-b bg-muted/50 flex items-center overflow-hidden">
      <ScrollArea className="flex-1 min-w-0">
        <div ref={tabsContainerRef} className="flex h-9 items-center" style={{ width: 'max-content' }}>
          {openFiles.map((file) => {
            const Icon = getFileIcon(file.name);
            const isActive = selectedFile?.path === file.path;
            const fileIndex = openFiles.findIndex((f) => f.path === file.path);
            const canCloseLeft = fileIndex > 0;
            const canCloseRight = fileIndex < openFiles.length - 1;

            return (
              <ContextMenu key={file.path}>
                <ContextMenuTrigger asChild>
                  <button
                    type="button"
                    data-tab-path={file.path}
                    onClick={() => handleTabClick(file)}
                    className={cn(
                      'group relative flex h-9 min-w-[140px] max-w-[280px] shrink-0 items-center gap-2 border-r border-border/50 px-3 text-sm transition-all',
                      'hover:bg-muted/70',
                      isActive
                        ? 'bg-background text-foreground border-b-2 border-b-primary shadow-sm'
                        : 'text-muted-foreground bg-muted/30',
                    )}
                    aria-selected={isActive}
                    aria-label={`Tab: ${file.name}`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate flex-1 text-left font-medium">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-5 w-5 shrink-0 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                        'hover:bg-destructive/10 hover:text-destructive',
                        isActive && 'opacity-70',
                      )}
                      onClick={(e) => handleCloseClick(e, file)}
                      aria-label={`Close ${file.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </button>
                </ContextMenuTrigger>
                <ContextMenuContent className="min-w-[180px]">
                  <ContextMenuItem onClick={() => closeFile(file)}>Close</ContextMenuItem>
                  <ContextMenuItem onClick={() => closeOthers(file)} disabled={openFiles.length <= 1}>
                    Close Others
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => closeToLeft(file)} disabled={!canCloseLeft}>
                    Close to the Left
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => closeToRight(file)} disabled={!canCloseRight}>
                    Close to the Right
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={closeAll}>Close All</ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => handleCopyPath(file.path)}>
                    <ClipboardCopy className="h-4 w-4" />
                    Copy Path
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <div className="shrink-0 border-l border-border/50 bg-muted/30 h-9 flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-none text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              aria-label="Tab actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            <DropdownMenuItem onClick={() => selectedFile && closeFile(selectedFile)} disabled={!selectedFile}>
              Close Active Tab
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => selectedFile && closeOthers(selectedFile)}
              disabled={!selectedFile || openFiles.length <= 1}
            >
              Close Other Tabs
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={closeAll}>
              <XCircle className="h-4 w-4" />
              Close All Tabs
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
