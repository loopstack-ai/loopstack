import type { AxiosInstance } from 'axios';
import { createFilesApi } from '../features/file-explorer/api/files';
import { createGitApi } from '../features/git/api/git';
import { createEnvironmentsApi } from './environments';
import { createWorkflowsApi } from './workflows';

export { createAxiosClient } from './client';

export function createApi(http: AxiosInstance) {
  return {
    environments: createEnvironmentsApi(http),
    files: {
      local: createFilesApi(http, 'local'),
      remote: createFilesApi(http, 'remote'),
    },
    git: createGitApi(http),
    workflows: createWorkflowsApi(http),
  };
}

export type ApiClient = ReturnType<typeof createApi>;
