import type { AxiosInstance } from 'axios';
import type { FileContentInterface, FileExplorerNodeInterface } from '@loopstack/contracts/api';

export function createWorkflowsApi(http: AxiosInstance) {
  return {
    getFileTree: (params: { workflowId: string }): Promise<FileExplorerNodeInterface[]> =>
      http.get<FileExplorerNodeInterface[]>(`/api/v1/files/workflows/${params.workflowId}`).then((res) => res.data),

    getFileContent: (params: { workflowId: string; filePath: string }): Promise<FileContentInterface> =>
      http
        .get<FileContentInterface>(`/api/v1/files/workflows/${params.workflowId}/${params.filePath}`)
        .then((res) => res.data),
  };
}
