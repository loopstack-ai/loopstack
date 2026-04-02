import type { AxiosInstance } from 'axios';
import type {
  AvailableEnvironmentInterface,
  WorkflowConfigInterface,
  WorkflowSourceInterface,
  WorkspaceConfigInterface,
} from '@loopstack/contracts/api';

export function createConfigApi(http: AxiosInstance) {
  return {
    getWorkspaceTypes: (): Promise<WorkspaceConfigInterface[]> =>
      http.get<WorkspaceConfigInterface[]>('/api/v1/config/workspaces').then((res) => res.data),

    getWorkflowTypesByWorkspace: (params: { workspaceBlockName: string }): Promise<WorkflowConfigInterface[]> =>
      http
        .get<
          WorkflowConfigInterface[]
        >(`/api/v1/config/workspaces/${encodeURIComponent(params.workspaceBlockName)}/workflows`)
        .then((res) => res.data),

    getWorkflowConfig: (params: { blockName: string }): Promise<WorkflowConfigInterface> =>
      http
        .get<WorkflowConfigInterface>(`/api/v1/config/workflows/${encodeURIComponent(params.blockName)}`)
        .then((res) => res.data),

    getWorkflowSource: (params: { blockName: string }): Promise<WorkflowSourceInterface> =>
      http
        .get<WorkflowSourceInterface>(`/api/v1/config/workflows/${encodeURIComponent(params.blockName)}/source`)
        .then((res) => res.data),

    getAvailableEnvironments: (): Promise<AvailableEnvironmentInterface[]> =>
      http.get<AvailableEnvironmentInterface[]>('/api/v1/config/environments').then((res) => res.data),
  };
}
