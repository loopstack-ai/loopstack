import { useMemo } from 'react';
import { type ApiClient, createApi, createAxiosClient } from '@/api';
import { useStudio } from '../providers/StudioProvider';

export function useApiClient(): { envKey: string; api: ApiClient } {
  const { environment } = useStudio();

  return useMemo(() => {
    const http = createAxiosClient(environment.url, environment.id);
    const api = createApi(http);

    return {
      envKey: environment.id,
      api,
    };
  }, [environment.id, environment.url]);
}
