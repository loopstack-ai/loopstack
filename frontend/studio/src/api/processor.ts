import type { AxiosInstance } from 'axios';
import type { RunWorkflowPayloadInterface } from '@loopstack/contracts/api';
import type { StartWorkflowPayload, WorkflowRunResult } from './types';

export function createProcessorApi(http: AxiosInstance) {
  return {
    startWorkflow: (params: { payload: StartWorkflowPayload }): Promise<WorkflowRunResult> =>
      http.post<WorkflowRunResult>('/api/v1/processor/start', params.payload).then((res) => res.data),

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
  };
}
