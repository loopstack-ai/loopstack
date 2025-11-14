import { useMemo } from 'react';
import { useFilterNamespaces } from './useNamespaces.ts';
import type { NamespaceItemDto } from '@loopstack/api-client';

export interface NamespaceTree extends NamespaceItemDto {
  childNodes: NamespaceTree[];
}

/**
 * Builds a hierarchical tree structure from a flat list of NamespaceItemDto objects
 */
function buildNamespaceTree(namespaces: NamespaceItemDto[]): NamespaceTree[] {
  const namespaceMap = new Map<string, NamespaceTree>();

  namespaces.forEach((namespace) => {
    namespaceMap.set(namespace.id, {
      ...namespace,
      childNodes: []
    });
  });

  const rootNodes: NamespaceTree[] = [];
  namespaces.forEach((namespace) => {
    const namespaceNode = namespaceMap.get(namespace.id)!;

    // If this namespace has a parent, add it as a child to its parent
    if (namespace.parentId) {
      const parentNode = namespaceMap.get(namespace.parentId);
      if (parentNode) {
        parentNode.childNodes.push(namespaceNode);
      } else {
        console.warn(
          `Parent namespace with ID ${namespace.parentId} not found for ${namespace.id}`
        );
        rootNodes.push(namespaceNode);
      }
    } else {
      // If this namespace has no parent, it's a root node
      rootNodes.push(namespaceNode);
    }
  });

  return rootNodes;
}

export function useNamespaceTree(pipelineId?: string): NamespaceTree[] {
  const fetchNamespaces = useFilterNamespaces(pipelineId);

  const namespaceTree = useMemo(() => {
    const namespaces = fetchNamespaces.data ?? [];
    return namespaces.length ? buildNamespaceTree(namespaces) : [];
  }, [fetchNamespaces.data]);

  return namespaceTree;
}
