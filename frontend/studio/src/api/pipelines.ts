import type { AxiosInstance } from 'axios';
import type {
  FileContentInterface,
  FileExplorerNodeInterface,
  PaginatedInterface,
  PipelineCreateInterface,
  PipelineInterface,
  PipelineItemInterface,
  PipelineUpdateInterface,
} from '@loopstack/contracts/api';

export function createPipelinesApi(http: AxiosInstance) {
  return {
    getById: (params: { id: string }): Promise<PipelineInterface> =>
      http.get<PipelineInterface>(`/api/v1/pipelines/${params.id}`).then((res) => res.data),

    getAll: (params?: {
      filter?: string;
      sortBy?: string;
      page?: number;
      limit?: number;
      search?: string;
      searchColumns?: string;
    }): Promise<PaginatedInterface<PipelineItemInterface>> =>
      http.get<PaginatedInterface<PipelineItemInterface>>('/api/v1/pipelines', { params }).then((res) => res.data),

    create: (params: { pipelineCreateDto: PipelineCreateInterface }): Promise<PipelineInterface> =>
      http.post<PipelineInterface>('/api/v1/pipelines', params.pipelineCreateDto).then((res) => res.data),

    update: (params: { id: string; pipelineUpdateDto: PipelineUpdateInterface }): Promise<PipelineInterface> =>
      http.put<PipelineInterface>(`/api/v1/pipelines/${params.id}`, params.pipelineUpdateDto).then((res) => res.data),

    delete: (params: { id: string }): Promise<void> =>
      http.delete<void>(`/api/v1/pipelines/id/${params.id}`).then((res) => res.data),

    batchDelete: (params: { ids: string[] }): Promise<void> =>
      http.delete<void>('/api/v1/pipelines/batch', { data: { ids: params.ids } }).then((res) => res.data),

    getFileTree: (params: { pipelineId: string }): Promise<FileExplorerNodeInterface[]> =>
      http.get<FileExplorerNodeInterface[]>(`/api/v1/pipelines/${params.pipelineId}/files`).then((res) => res.data),

    getFileContent: (params: { pipelineId: string; filePath: string }): Promise<FileContentInterface> =>
      http
        .get<FileContentInterface>(`/api/v1/pipelines/${params.pipelineId}/files/${params.filePath}`)
        .then((res) => res.data),
  };
}
