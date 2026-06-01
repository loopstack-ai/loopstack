import type { AxiosInstance } from 'axios';
import type {
  AvailableEnvironmentInterface,
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

    getAvailableEnvironments: (): Promise<AvailableEnvironmentInterface[]> =>
      http.get<AvailableEnvironmentInterface[]>('/api/v1/config/environments').then((res) => res.data),
  };
}
