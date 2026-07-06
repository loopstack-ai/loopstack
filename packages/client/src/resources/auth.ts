import type {
  AuthMessageInterface,
  AuthUserInterface,
  HubLoginRequestInterface,
  HubLoginResponseInterface,
  WorkerInfoInterface,
} from '@loopstack/contracts/api';
import type { HttpClient } from '../http.js';

export function createAuthResource(http: HttpClient) {
  return {
    /** The authenticated user. 401 on backends with auth enabled and no session. */
    me: (): Promise<AuthUserInterface> => http.get('/api/v1/auth/me'),

    /** Public liveness/config probe of the backend. */
    workerHealth: (): Promise<WorkerInfoInterface> => http.get('/api/v1/auth/worker/health'),

    /** Exchange a hub-issued id token for a cookie session. */
    hubLogin: (payload: HubLoginRequestInterface): Promise<HubLoginResponseInterface> =>
      http.post('/api/v1/auth/oauth/hub', payload),

    /** Rotate the cookie session using the refresh-token cookie. */
    refresh: (): Promise<AuthMessageInterface> => http.post('/api/v1/auth/refresh'),

    logout: (): Promise<AuthMessageInterface> => http.post('/api/v1/auth/logout'),
  };
}

export type AuthResource = ReturnType<typeof createAuthResource>;
