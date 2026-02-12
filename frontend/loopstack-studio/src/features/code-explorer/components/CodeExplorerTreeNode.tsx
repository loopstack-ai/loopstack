import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { FileExplorerNode } from '../types';
import { getFileIcon, getFolderIcon } from '../utils/fileIcons';

interface CodeExplorerTreeNodeProps {
  node: FileExplorerNode;
  depth: number;
  onSelectFile?: (node: FileExplorerNode) => void;
  onClearSelection?: () => void;
  isSelected?: boolean;
  selectedFileId?: string;
}

const INDENT_PX = 16;
const BASE_PADDING_PX = 8;

export function CodeExplorerTreeNode({
  node,
  depth,
  onSelectFile,
  onClearSelection,
  isSelected = false,
  selectedFileId,
}: CodeExplorerTreeNodeProps) {
  const [open, setOpen] = useState(false);
  const paddingLeft = depth * INDENT_PX + BASE_PADDING_PX;

  const nodeIsSelected = selectedFileId === node.id || isSelected;

  if (node.type === 'file') {
    const Icon = getFileIcon(node.name);
    return (
      <div
        className={cn(
          'flex w-full min-w-0 items-center gap-2 rounded-sm py-1 group',
          'text-muted-foreground',
          nodeIsSelected && 'bg-muted',
        )}
        style={{ paddingLeft }}
      >
        <button
          type="button"
          className={cn(
            'flex flex-1 min-w-0 items-center gap-2 rounded-sm text-left text-sm hover:bg-muted/50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
          onClick={() => onSelectFile?.(node)}
          aria-label={`Select file ${node.name}`}
        >
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">{node.name}</span>
        </button>
        {nodeIsSelected && onClearSelection && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onClearSelection();
            }}
            aria-label="Close file"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }

  const hasChildren = node.children && node.children.length > 0;
  const FolderIcon = getFolderIcon(open);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          'flex w-full min-w-0 items-center gap-1 rounded-sm py-1 text-left text-sm hover:bg-muted',
          'text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-default disabled:opacity-50',
        )}
        style={{ paddingLeft }}
        disabled={!hasChildren}
        aria-label={`${open ? 'Collapse' : 'Expand'} folder ${node.name}`}
      >
        {hasChildren ? (
          open ? (
            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          )
        ) : (
          <span className="w-4 shrink-0" aria-hidden />
        )}
        <FolderIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate">{node.name}</span>
      </CollapsibleTrigger>
      {hasChildren && (
        <CollapsibleContent className="h-full">
          {node.children!.map((child) => (
            <CodeExplorerTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelectFile={onSelectFile}
              onClearSelection={onClearSelection}
              selectedFileId={selectedFileId}
            />
          ))}
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}
