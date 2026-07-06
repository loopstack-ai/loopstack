import type {
  AvailableEnvironmentInterface,
  StudioAppConfig,
  ToolConfigInterface,
  WorkflowConfigInterface,
  WorkflowSourceInterface,
} from '@loopstack/contracts/api';
import type { HttpClient } from '../http.js';

export function createConfigResource(http: HttpClient) {
  return {
    /** Every @StudioApp of the backend with its workflows, documents, and UI config. */
    apps: (): Promise<StudioAppConfig[]> => http.get('/api/v1/config/apps'),

    workflowConfig: (workflowName: string): Promise<WorkflowConfigInterface> =>
      http.get(`/api/v1/config/workflows/${encodeURIComponent(workflowName)}`),

    workflowSource: (workflowName: string): Promise<WorkflowSourceInterface> =>
      http.get(`/api/v1/config/workflows/${encodeURIComponent(workflowName)}/source`),

    tools: (): Promise<ToolConfigInterface[]> => http.get('/api/v1/config/tools'),

    tool: (toolName: string): Promise<ToolConfigInterface> =>
      http.get(`/api/v1/config/tools/${encodeURIComponent(toolName)}`),

    availableEnvironments: (): Promise<AvailableEnvironmentInterface[]> => http.get('/api/v1/config/environments'),
  };
}

export type ConfigResource = ReturnType<typeof createConfigResource>;
