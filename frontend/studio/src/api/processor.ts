import type { AxiosInstance } from 'axios';
import type { RunPipelinePayloadInterface } from '@loopstack/contracts/api';

export function createProcessorApi(http: AxiosInstance) {
  return {
    runPipeline: (params: {
      pipelineId: string;
      runPipelinePayloadDto: RunPipelinePayloadInterface;
      force?: boolean;
    }): Promise<void> =>
      http
        .post<void>(
          `/api/v1/processor/run/${params.pipelineId}`,
          params.runPipelinePayloadDto,
          params.force !== undefined ? { params: { force: params.force } } : undefined,
        )
        .then((res) => res.data),
  };
}
