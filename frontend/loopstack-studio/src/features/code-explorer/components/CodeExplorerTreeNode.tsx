import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { FileExplorerNode } from '../types';
import { getFileIcon } from '../utils/fileIcons';

interface CodeExplorerTreeNodeProps {
  node: FileExplorerNode;
  depth: number;
  onSelectFile?: (node: FileExplorerNode) => void;
}

const INDENT_PX = 16;
const BASE_PADDING_PX = 8;

export function CodeExplorerTreeNode({ node, depth, onSelectFile }: CodeExplorerTreeNodeProps) {
  const [open, setOpen] = useState(false);
  const paddingLeft = depth * INDENT_PX + BASE_PADDING_PX;

  if (node.type === 'file') {
    const Icon = getFileIcon(node.name);
    return (
      <button
        type="button"
        className={cn(
          'flex w-full min-w-0 items-center gap-2 rounded-sm py-1 text-left text-sm hover:bg-muted',
          'text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
        style={{ paddingLeft }}
        onClick={() => onSelectFile?.(node)}
      >
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  const hasChildren = node.children && node.children.length > 0;
  const isOpen = open;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          'flex w-full min-w-0 items-center gap-1 rounded-sm py-1 text-left text-sm hover:bg-muted',
          'text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
        style={{ paddingLeft }}
        disabled={!hasChildren}
      >
        {hasChildren ? (
          isOpen ? (
            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          )
        ) : (
          <span className="w-4 shrink-0" aria-hidden />
        )}
        {isOpen ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <span className="truncate">{node.name}</span>
      </CollapsibleTrigger>
      {hasChildren && (
        <CollapsibleContent>
          {node.children!.map((child) => (
            <CodeExplorerTreeNode key={child.id} node={child} depth={depth + 1} onSelectFile={onSelectFile} />
          ))}
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}
