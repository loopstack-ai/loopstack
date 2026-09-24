import { useQueries } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { DocumentItemInterface, WorkflowFullInterface } from '@loopstack/contracts/api';
import { useLoopstackClient } from '@loopstack/react';

export interface RunTreeNode {
  workflowId: string;
  depth: number;
  workflow: WorkflowFullInterface;
  /** All documents of the workflow, invalidated included — the CLI transcript's document set. */
  documents: DocumentItemInterface[];
}

/**
 * The run tree as the CLI walks it: breadth-first from the root, one node per workflow
 * with its depth and full document history. Composed from per-node standard queries so
 * the SSE cache invalidation keeps every node live; newly discovered children expand
 * the query set as their parent's children list arrives.
 */
export function useRunTree(rootWorkflowId: string | undefined): { nodes: RunTreeNode[]; isLoading: boolean } {
  const client = useLoopstackClient();
  const [ids, setIds] = useState<string[]>(rootWorkflowId ? [rootWorkflowId] : []);
  const depths = useMemo(() => new Map<string, number>(rootWorkflowId ? [[rootWorkflowId, 0]] : []), [rootWorkflowId]);

  // Reset the walk when the root changes.
  useEffect(() => {
    setIds(rootWorkflowId ? [rootWorkflowId] : []);
  }, [rootWorkflowId]);

  const workflowResults = useQueries({
    queries: ids.map((id) => ({ ...client.queries.workflow(id) })),
  });
  const childrenResults = useQueries({
    queries: ids.map((id) => ({ ...client.queries.childWorkflows(id) })),
  });
  const documentResults = useQueries({
    // The transcript shows re-saved documents too, so this window is the 'all' scope.
    queries: ids.map((id) => ({ ...client.queries.documents(id, 'all') })),
  });

  // Fold newly discovered children into the walk (visited-set semantics).
  useEffect(() => {
    const known = new Set(ids);
    const discovered: string[] = [];
    ids.forEach((id, index) => {
      const children = childrenResults[index]?.data?.data ?? [];
      for (const child of children) {
        if (known.has(child.id)) continue;
        known.add(child.id);
        depths.set(child.id, (depths.get(id) ?? 0) + 1);
        discovered.push(child.id);
      }
    });
    if (discovered.length > 0) setIds((current) => [...current, ...discovered]);
  }, [ids, ...childrenResults.map((result) => result.data)]);

  const nodes = useMemo(
    () =>
      ids
        .map((id, index) => {
          const workflow = workflowResults[index]?.data;
          if (!workflow) return undefined;
          return {
            workflowId: id,
            depth: depths.get(id) ?? 0,
            workflow,
            documents: documentResults[index]?.data?.documents ?? [],
          };
        })
        .filter((node): node is RunTreeNode => node !== undefined),
    [ids, depths, ...workflowResults.map((result) => result.data), ...documentResults.map((result) => result.data)],
  );

  return { nodes, isLoading: workflowResults[0]?.isLoading ?? true };
}
