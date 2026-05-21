import type { AxiosInstance } from 'axios';
import type {
  AppConfigInterface,
  AvailableEnvironmentInterface,
  WorkflowConfigInterface,
  WorkflowSourceInterface,
} from '@loopstack/contracts/api';

export function createConfigApi(http: AxiosInstance) {
  return {
    getAppTypes: (): Promise<AppConfigInterface[]> =>
      http.get<AppConfigInterface[]>('/api/v1/config/workspaces').then((res) => res.data),

    getWorkflowTypesByApp: (params: { appBlockName: string }): Promise<WorkflowConfigInterface[]> =>
      http
        .get<
          WorkflowConfigInterface[]
        >(`/api/v1/config/workspaces/${encodeURIComponent(params.appBlockName)}/workflows`)
        .then((res) => res.data),

    getWorkflowConfig: (params: { alias: string }): Promise<WorkflowConfigInterface> =>
      http
        .get<WorkflowConfigInterface>(`/api/v1/config/workflows/${encodeURIComponent(params.alias)}`)
        .then((res) => res.data),

    getWorkflowSource: (params: { alias: string }): Promise<WorkflowSourceInterface> =>
      http
        .get<WorkflowSourceInterface>(`/api/v1/config/workflows/${encodeURIComponent(params.alias)}/source`)
        .then((res) => res.data),

    getAvailableEnvironments: (): Promise<AvailableEnvironmentInterface[]> =>
      http.get<AvailableEnvironmentInterface[]>('/api/v1/config/environments').then((res) => res.data),
  };
}
