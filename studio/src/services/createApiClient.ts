import { createClient } from '@loopstack/client';
import type { AuthResource } from '@loopstack/client';
import type { Environment } from '../types';
import { createReportingFetch } from './reporting-fetch';

/** Auth surface of an environment, for hosts that probe/login before mounting Studio. */
export function createApiClient(environment: Environment): { auth: AuthResource } {
  const client = createClient({
    url: environment.url,
    envKey: environment.id,
    credentials: 'include',
    fetch: createReportingFetch(environment.id),
  });

  return {
    auth: client.auth,
  };
}
