import { useWorkflowDocuments } from '@loopstack/react';

export { useDocument } from '@loopstack/react';

/**
 * Fetch the visible documents of a workflow run, in display order.
 */
export function useFilterDocuments(workflowId: string | undefined) {
  return useWorkflowDocuments(workflowId, { select: (page) => page.data });
}
