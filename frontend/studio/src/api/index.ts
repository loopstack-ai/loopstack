import type { AxiosInstance } from 'axios';
import { createFilesApi } from '../features/file-explorer/api/files';
import { createGitApi } from '../features/git/api/git';
import { createAuthApi } from './auth';
import { createConfigApi } from './config';
import { createDashboardApi } from './dashboard';
import { createDocumentsApi } from './documents';
import { createEnvironmentsApi } from './environments';
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
    environments: createEnvironmentsApi(http),
    files: createFilesApi(http),
    git: createGitApi(http),
    processor: createProcessorApi(http),
    secrets: createSecretsApi(http),
    workflows: createWorkflowsApi(http),
    workspaces: createWorkspacesApi(http),
  };
}

export type ApiClient = ReturnType<typeof createApi>;
