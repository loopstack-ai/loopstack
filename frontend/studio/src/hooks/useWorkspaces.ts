import type { WorkspaceFilterInterface, WorkspaceSortByInterface } from '@loopstack/contracts/api';
import { useWorkspaceList } from '@loopstack/react';

export {
  useBatchDeleteWorkspaces,
  useCreateWorkspace,
  useDeleteWorkspace,
  useSetFavouriteWorkspace,
  useUpdateWorkspace,
  useWorkspace,
} from '@loopstack/react';

/**
 * Fetch a filtered, sorted, paginated list of workspaces.
 */
export function useFilterWorkspaces(
  searchTerm: string | undefined,
  filter: Record<string, string>,
  sortBy: string = 'id',
  order: string = 'DESC',
  page: number = 0,
  limit: number = 10,
) {
  return useWorkspaceList({
    ...(Object.keys(filter).length > 0 && { filter: filter as WorkspaceFilterInterface }),
    sortBy: [{ field: sortBy, order } as WorkspaceSortByInterface],
    page,
    limit,
    ...(searchTerm && { search: searchTerm }),
  });
}
