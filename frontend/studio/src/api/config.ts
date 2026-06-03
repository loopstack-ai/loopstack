import type { AxiosInstance } from 'axios';
import type {
  AvailableEnvironmentInterface,
  ToolConfigInterface,
  WorkflowConfigInterface,
  WorkflowSourceInterface,
} from '@loopstack/contracts/api';
import type { StudioAppConfig } from './types';

export function createConfigApi(http: AxiosInstance) {
  return {
    getApps: (): Promise<StudioAppConfig[]> =>
      http.get<StudioAppConfig[]>('/api/v1/config/apps').then((res) => res.data),

    getWorkflowConfig: (params: { workflowName: string }): Promise<WorkflowConfigInterface> =>
      http
        .get<WorkflowConfigInterface>(`/api/v1/config/workflows/${encodeURIComponent(params.workflowName)}`)
        .then((res) => res.data),

    getWorkflowSource: (params: { workflowName: string }): Promise<WorkflowSourceInterface> =>
      http
        .get<WorkflowSourceInterface>(`/api/v1/config/workflows/${encodeURIComponent(params.workflowName)}/source`)
        .then((res) => res.data),

    getToolConfigs: (): Promise<ToolConfigInterface[]> =>
      http.get<ToolConfigInterface[]>('/api/v1/config/tools').then((res) => res.data),

    getToolConfig: (params: { toolName: string }): Promise<ToolConfigInterface> =>
      http
        .get<ToolConfigInterface>(`/api/v1/config/tools/${encodeURIComponent(params.toolName)}`)
        .then((res) => res.data),

    getAvailableEnvironments: (): Promise<AvailableEnvironmentInterface[]> =>
      http.get<AvailableEnvironmentInterface[]>('/api/v1/config/environments').then((res) => res.data),
  };
}
