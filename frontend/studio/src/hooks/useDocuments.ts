import { useWorkflowDocuments } from '@loopstack/react';

export { useDocument } from '@loopstack/react';

/**
 * Fetch the newest documents of a workflow run, in display order, with `loadOlder()` for its history.
 */
export function useFilterDocuments(workflowId: string | undefined) {
  return useWorkflowDocuments(workflowId);
}
