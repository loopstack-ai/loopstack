import type { AxiosInstance } from 'axios';
import type { RunWorkflowPayloadInterface } from '@loopstack/contracts/api';
import type { WorkflowPayload, WorkflowRunResult } from './types';

export function createProcessorApi(http: AxiosInstance) {
  return {
    runWorkflow: (params: {
      workflowId: string;
      runWorkflowPayloadDto: RunWorkflowPayloadInterface;
      force?: boolean;
    }): Promise<void> =>
      http
        .post<void>(
          `/api/v1/processor/run/${params.workflowId}`,
          params.runWorkflowPayloadDto,
          params.force !== undefined ? { params: { force: params.force } } : undefined,
        )
        .then((res) => res.data),

    executeController: (params: { path: string; payload: WorkflowPayload }): Promise<WorkflowRunResult> =>
      http.post<WorkflowRunResult>(params.path, params.payload).then((res) => res.data),
  };
}
