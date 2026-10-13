import { type UseQueryResult, useQueries } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
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
  const [storedWalk, setWalk] = useState(() => startWalk(rootWorkflowId));
  // Reset the walk when the root changes.
  const walk = storedWalk.root === rootWorkflowId ? storedWalk : startWalk(rootWorkflowId);
  if (walk !== storedWalk) {
    setWalk(walk);
  }
  const { ids, depths } = walk;

  const workflows = useQueries({
    queries: ids.map((id) => ({ ...client.queries.workflow(id) })),
    combine: combineWorkflows,
  });
  const children = useQueries({
    queries: ids.map((id) => ({ ...client.queries.childWorkflows(id) })),
    combine: dataOf,
  });
  const documents = useQueries({
    // The transcript shows re-saved documents too, so this window is the 'all' scope.
    queries: ids.map((id) => ({ ...client.queries.documents(id, 'all') })),
    combine: dataOf,
  });

  // Fold newly discovered children into the walk (visited-set semantics). Adjusted during render, as the
  // children arrive with the query data rather than through one handler.
  const known = new Set(ids);
  const discovered: string[] = [];
  const nextDepths = new Map(depths);
  ids.forEach((id, index) => {
    for (const child of children[index]?.data ?? []) {
      if (known.has(child.id)) continue;
      known.add(child.id);
      nextDepths.set(child.id, (depths.get(id) ?? 0) + 1);
      discovered.push(child.id);
    }
  });
  if (discovered.length > 0) {
    setWalk({ root: rootWorkflowId, ids: [...ids, ...discovered], depths: nextDepths });
  }

  const nodes = useMemo(
    () =>
      ids
        .map((id, index) => {
          const workflow = workflows.data[index];
          if (!workflow) return undefined;
          return {
            workflowId: id,
            depth: depths.get(id) ?? 0,
            workflow,
            documents: documents[index]?.documents ?? [],
          };
        })
        .filter((node): node is RunTreeNode => node !== undefined),
    [ids, depths, workflows.data, documents],
  );

  return { nodes, isLoading: workflows.isLoading };
}

interface Walk {
  root: string | undefined;
  ids: string[];
  depths: Map<string, number>;
}

function startWalk(root: string | undefined): Walk {
  return { root, ids: root ? [root] : [], depths: new Map(root ? [[root, 0]] : []) };
}

/** A `useQueries` combine: module-level, so the combined result stays stable while no query data changes. */
export function dataOf<TData>(results: UseQueryResult<TData>[]): (TData | undefined)[] {
  return results.map((result) => result.data);
}

function combineWorkflows(results: UseQueryResult<WorkflowFullInterface>[]) {
  return { data: dataOf(results), isLoading: results[0]?.isLoading ?? true };
}
