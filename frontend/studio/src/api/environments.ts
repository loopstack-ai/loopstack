import type { AxiosInstance } from 'axios';
import type { WorkspaceEnvironmentInterface } from '@loopstack/contracts/api';

export function createEnvironmentsApi(http: AxiosInstance) {
  return {
    getByWorkspace: (workspaceId: string): Promise<WorkspaceEnvironmentInterface[]> =>
      http
        .get<WorkspaceEnvironmentInterface[]>(`/api/v1/workspaces/${workspaceId}/environments`)
        .then((res) => res.data),

    replaceEnvironments: (
      workspaceId: string,
      environments: WorkspaceEnvironmentInterface[],
    ): Promise<WorkspaceEnvironmentInterface[]> =>
      http
        .put<WorkspaceEnvironmentInterface[]>(`/api/v1/workspaces/${workspaceId}/environments`, environments)
        .then((res) => res.data),

    resetEnvironment: (params: {
      workspaceId: string;
      slotId: string;
    }): Promise<{ success: boolean; message: string }> =>
      http
        .post<{
          success: boolean;
          message: string;
        }>(`/api/v1/workspaces/${params.workspaceId}/environments/${params.slotId}/reset`)
        .then((res) => res.data),
  };
}
