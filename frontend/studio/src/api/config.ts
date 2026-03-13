import type { AxiosInstance } from 'axios';
import type {
  AvailableEnvironmentInterface,
  PipelineConfigInterface,
  PipelineSourceInterface,
  WorkspaceConfigInterface,
} from '@loopstack/contracts/api';

export function createConfigApi(http: AxiosInstance) {
  return {
    getWorkspaceTypes: (): Promise<WorkspaceConfigInterface[]> =>
      http.get<WorkspaceConfigInterface[]>('/api/v1/config/workspaces').then((res) => res.data),

    getPipelineTypesByWorkspace: (params: { workspaceBlockName: string }): Promise<PipelineConfigInterface[]> =>
      http
        .get<
          PipelineConfigInterface[]
        >(`/api/v1/config/workspaces/${encodeURIComponent(params.workspaceBlockName)}/pipelines`)
        .then((res) => res.data),

    getPipelineConfigByName: (params: {
      workspaceBlockName: string;
      pipelineName: string;
    }): Promise<PipelineConfigInterface> =>
      http
        .get<PipelineConfigInterface>(
          `/api/v1/config/workspaces/${encodeURIComponent(params.workspaceBlockName)}/pipelines/${encodeURIComponent(params.pipelineName)}`,
        )
        .then((res) => res.data),

    getPipelineSourceByName: (params: {
      workspaceBlockName: string;
      pipelineName: string;
    }): Promise<PipelineSourceInterface> =>
      http
        .get<PipelineSourceInterface>(
          `/api/v1/config/workspaces/${encodeURIComponent(params.workspaceBlockName)}/pipelines/${encodeURIComponent(params.pipelineName)}/source`,
        )
        .then((res) => res.data),

    getAvailableEnvironments: (): Promise<AvailableEnvironmentInterface[]> =>
      http.get<AvailableEnvironmentInterface[]>('/api/v1/config/environments').then((res) => res.data),
  };
}
