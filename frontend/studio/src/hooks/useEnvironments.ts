import { useMutation } from '@tanstack/react-query';
import { useApiClient } from './useApi.ts';

export function useResetEnvironment() {
  const { api } = useApiClient();

  return useMutation({
    mutationFn: (params: { workspaceId: string; slotId: string }) => api.environments.resetEnvironment(params),
  });
}
