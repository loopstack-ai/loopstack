import { type ApiClient, createApi, createAxiosClient } from '../api';
import type { Environment } from '../types';

export function createApiClient(environment: Environment): { auth: ApiClient['auth'] } {
  const http = createAxiosClient(environment.url, environment.id);
  const api = createApi(http);

  return {
    auth: api.auth,
  };
}
