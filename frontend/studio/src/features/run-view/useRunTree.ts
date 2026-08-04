import { useQueries } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { LoopstackClient } from '@loopstack/client';
import type { DocumentItemInterface, WorkflowFullInterface } from '@loopstack/contracts/api';
import { SortOrder } from '@loopstack/contracts/enums';
import { useLoopstackClient } from '@loopstack/react';

export interface RunTreeNode {
  workflowId: string;
  depth: number;
  workflow: WorkflowFullInterface;
  /** All documents of the workflow, invalidated included — the CLI transcript's document set. */
  documents: DocumentItemInterface[];
}

const DOCUMENTS_PAGE_SIZE = 100;
const DOCUMENTS_MAX_PAGES = 5;

/**
 * All documents of a workflow (re-saves included — the CLI transcript renders them as
 * honest output). The key extends the standard documents key, so the SSE invalidation
 * that stales `documents(workflowId)` prefix-matches this one too.
 */
function allDocumentsQuery(client: LoopstackClient, workflowId: string) {
  return {
    queryKey: [...client.queries.documents(workflowId).queryKey, 'all'] as const,
    queryFn: async (): Promise<DocumentItemInterface[]> => {
      const documents: DocumentItemInterface[] = [];
      for (let page = 0; page < DOCUMENTS_MAX_PAGES; page++) {
        const result = await client.documents.list({
          filter: { workflowId },
          sortBy: [{ field: 'index', order: SortOrder.ASC }],
          page,
          limit: DOCUMENTS_PAGE_SIZE,
        });
        documents.push(...result.data);
        if (result.data.length < DOCUMENTS_PAGE_SIZE) break;
      }
      return documents;
    },
  };
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
    queries: ids.map((id) => allDocumentsQuery(client, id)),
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
            documents: documentResults[index]?.data ?? [],
          };
        })
        .filter((node): node is RunTreeNode => node !== undefined),
    [ids, depths, ...workflowResults.map((result) => result.data), ...documentResults.map((result) => result.data)],
  );

  return { nodes, isLoading: workflowResults[0]?.isLoading ?? true };
}
