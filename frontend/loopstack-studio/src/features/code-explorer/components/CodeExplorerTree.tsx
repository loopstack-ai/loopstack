import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { FileExplorerNode } from '../types';
import { CodeExplorerTreeNode } from './CodeExplorerTreeNode';

function filterTree(nodes: FileExplorerNode[], query: string): FileExplorerNode[] {
  if (!query.trim()) return nodes;
  const q = query.trim().toLowerCase();
  return nodes.map((node) => filterNode(node, q)).filter((node): node is FileExplorerNode => node !== null);
}

function filterNode(node: FileExplorerNode, query: string): FileExplorerNode | null {
  if (node.type === 'file') {
    return node.name.toLowerCase().includes(query) ? node : null;
  }

  const filteredChildren = node.children
    ? node.children.map((child) => filterNode(child, query)).filter((n): n is FileExplorerNode => n !== null)
    : [];

  const matchesSelf = node.name.toLowerCase().includes(query);

  if (matchesSelf || filteredChildren.length > 0) {
    return {
      ...node,
      children: filteredChildren.length > 0 ? filteredChildren : node.children,
    };
  }

  return null;
}

interface CodeExplorerTreeProps {
  nodes: FileExplorerNode[];
  searchQuery?: string;
  onSelectFile?: (node: FileExplorerNode) => void;
  onClearSelection?: () => void;
  selectedFileId?: string;
}

export function CodeExplorerTree({
  nodes,
  searchQuery = '',
  onSelectFile,
  onClearSelection,
  selectedFileId,
}: CodeExplorerTreeProps) {
  const filteredNodes = useMemo(() => filterTree(nodes, searchQuery), [nodes, searchQuery]);

  return (
    <ScrollArea className="h-full w-full">
      <div className="w-full py-1" role="tree" aria-label="File tree">
        {filteredNodes.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">No files match</p>
        ) : (
          filteredNodes.map((node) => (
            <CodeExplorerTreeNode
              key={node.id}
              node={node}
              depth={0}
              onSelectFile={onSelectFile}
              onClearSelection={onClearSelection}
              selectedFileId={selectedFileId}
            />
          ))
        )}
      </div>
    </ScrollArea>
  );
}
