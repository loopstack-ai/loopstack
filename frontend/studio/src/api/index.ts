import type { AxiosInstance } from 'axios';
import { createFilesApi } from '../features/file-explorer/api/files';
import { createGitApi } from '../features/git/api/git';
import { createAuthApi } from './auth';
import { createConfigApi } from './config';
import { createDashboardApi } from './dashboard';
import { createEnvironmentsApi } from './environments';
import { createSecretsApi } from './secrets';
import { createWorkflowsApi } from './workflows';
import { createWorkspacesApi } from './workspaces';

export { createAxiosClient } from './client';

export function createApi(http: AxiosInstance) {
  return {
    auth: createAuthApi(http),
    config: createConfigApi(http),
    dashboard: createDashboardApi(http),
    environments: createEnvironmentsApi(http),
    files: {
      local: createFilesApi(http, 'local'),
      remote: createFilesApi(http, 'remote'),
    },
    git: createGitApi(http),
    secrets: createSecretsApi(http),
    workflows: createWorkflowsApi(http),
    workspaces: createWorkspacesApi(http),
  };
}

export type ApiClient = ReturnType<typeof createApi>;
