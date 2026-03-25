import type { AxiosInstance } from 'axios';

export interface SecretItem {
  id: string;
  key: string;
  hasValue: boolean;
}

export function createSecretsApi(http: AxiosInstance) {
  return {
    getByWorkspaceId: (params: { workspaceId: string }): Promise<SecretItem[]> =>
      http.get<SecretItem[]>(`/api/v1/workspaces/${params.workspaceId}/secrets`).then((res) => res.data),

    create: (params: { workspaceId: string; key: string; value: string }): Promise<{ id: string; key: string }> =>
      http
        .post<{ id: string; key: string }>(`/api/v1/workspaces/${params.workspaceId}/secrets`, {
          key: params.key,
          value: params.value,
        })
        .then((res) => res.data),

    upsert: (params: { workspaceId: string; key: string; value: string }): Promise<{ id: string; key: string }> =>
      http
        .put<{ id: string; key: string }>(`/api/v1/workspaces/${params.workspaceId}/secrets/upsert`, {
          key: params.key,
          value: params.value,
        })
        .then((res) => res.data),

    update: (params: { workspaceId: string; id: string; value?: string }): Promise<{ id: string; key: string }> =>
      http
        .put<{ id: string; key: string }>(`/api/v1/workspaces/${params.workspaceId}/secrets/${params.id}`, {
          value: params.value,
        })
        .then((res) => res.data),

    delete: (params: { workspaceId: string; id: string }): Promise<{ success: boolean }> =>
      http
        .delete<{ success: boolean }>(`/api/v1/workspaces/${params.workspaceId}/secrets/${params.id}`)
        .then((res) => res.data),
  };
}
