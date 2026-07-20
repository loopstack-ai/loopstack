import type {
  RunWorkflowPayloadInterface,
  StartWorkflowPayloadInterface,
  WorkflowRunResult,
} from '@loopstack/contracts/api';
import type { HttpClient } from '../http.js';

export function createProcessorResource(http: HttpClient) {
  return {
    /** Starts a new workflow by name. */
    start: (payload: StartWorkflowPayloadInterface): Promise<WorkflowRunResult> =>
      http.post('/api/v1/processor/start', payload),

    /**
     * Runs a workflow from its current place. Pass a `transition` to answer a
     * waiting transition (e.g. a HITL prompt).
     */
    run: (workflowId: string, payload: RunWorkflowPayloadInterface = {}): Promise<void> =>
      http.post(`/api/v1/processor/run/${workflowId}`, payload),
  };
}

export type ProcessorResource = ReturnType<typeof createProcessorResource>;
