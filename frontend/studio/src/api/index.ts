import type { AxiosInstance } from 'axios';
import { createAuthApi } from './auth';
import { createConfigApi } from './config';
import { createDashboardApi } from './dashboard';
import { createDocumentsApi } from './documents';
import { createNamespacesApi } from './namespaces';
import { createPipelinesApi } from './pipelines';
import { createProcessorApi } from './processor';
import { createWorkflowsApi } from './workflows';
import { createWorkspacesApi } from './workspaces';

export { createAxiosClient } from './client';

export function createApi(http: AxiosInstance) {
  return {
    auth: createAuthApi(http),
    config: createConfigApi(http),
    dashboard: createDashboardApi(http),
    documents: createDocumentsApi(http),
    namespaces: createNamespacesApi(http),
    pipelines: createPipelinesApi(http),
    processor: createProcessorApi(http),
    workflows: createWorkflowsApi(http),
    workspaces: createWorkspacesApi(http),
  };
}

export type ApiClient = ReturnType<typeof createApi>;
