import type { AxiosInstance } from 'axios';

export interface GitStatusResponse {
  branch: string;
  staged: string[];
  modified: string[];
  untracked: string[];
  deleted: string[];
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitLogResponse {
  commits: GitCommit[];
}

export interface GitRemoteResponse {
  name: string;
  url: string;
}

export function createGitApi(http: AxiosInstance) {
  return {
    getStatus: (params: { workspaceId: string }): Promise<GitStatusResponse> =>
      http.get<GitStatusResponse>(`/api/v1/workspaces/${params.workspaceId}/git/status`).then((res) => res.data),

    getLog: (params: { workspaceId: string; limit?: number }): Promise<GitLogResponse> =>
      http
        .get<GitLogResponse>(`/api/v1/workspaces/${params.workspaceId}/git/log`, {
          params: params.limit ? { limit: params.limit } : undefined,
        })
        .then((res) => res.data),

    getRemote: (params: { workspaceId: string }): Promise<GitRemoteResponse | null> =>
      http.get<GitRemoteResponse | null>(`/api/v1/workspaces/${params.workspaceId}/git/remote`).then((res) => res.data),

    removeRemote: (params: { workspaceId: string }): Promise<{ success: boolean }> =>
      http.delete<{ success: boolean }>(`/api/v1/workspaces/${params.workspaceId}/git/remote`).then((res) => res.data),
  };
}
