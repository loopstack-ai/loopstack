import type { AxiosInstance } from 'axios';

export function createEnvironmentsApi(http: AxiosInstance) {
  return {
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
