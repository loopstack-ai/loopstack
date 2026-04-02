import type { AxiosInstance } from 'axios';
import { createAuthApi } from './auth';
import { createConfigApi } from './config';
import { createDashboardApi } from './dashboard';
import { createDocumentsApi } from './documents';
import { createProcessorApi } from './processor';
import { createSecretsApi } from './secrets';
import { createWorkflowsApi } from './workflows';
import { createWorkspacesApi } from './workspaces';

export { createAxiosClient } from './client';

export function createApi(http: AxiosInstance) {
  return {
    auth: createAuthApi(http),
    config: createConfigApi(http),
    dashboard: createDashboardApi(http),
    documents: createDocumentsApi(http),
    processor: createProcessorApi(http),
    secrets: createSecretsApi(http),
    workflows: createWorkflowsApi(http),
    workspaces: createWorkspacesApi(http),
  };
}

export type ApiClient = ReturnType<typeof createApi>;
