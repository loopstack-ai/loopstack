import { useMe as useSdkMe, useWorkerHealth } from '@loopstack/react';

export { useHubLogin as useWorkerAuth, useRefreshSession as useWorkerAuthTokenRefresh } from '@loopstack/react';

export function useMe(enabled = true) {
  return useSdkMe({ staleTime: 5 * 60 * 1000, enabled });
}

export function useGetHealthInfo(enabled = true) {
  return useWorkerHealth({ staleTime: 5 * 60 * 1000, enabled });
}
