import type { AxiosInstance } from 'axios';
import type { RunWorkflowPayloadInterface } from '@loopstack/contracts/api';

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
  };
}
