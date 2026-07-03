import { ApiClientEvents, apiClientEvents } from '@/events';

/**
 * Reports API transport errors of the SDK's requests (REST and event stream)
 * into the health-check escalation flow.
 */
export function createReportingFetch(environmentId: string): typeof fetch {
  return async (input, init) => {
    try {
      const response = await fetch(input, init);
      if (response.status === 401 || response.status === 403) {
        apiClientEvents.emit(ApiClientEvents.UNAUTHORIZED, environmentId);
      }
      return response;
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        apiClientEvents.emit(ApiClientEvents.ERR_NETWORK, environmentId);
      }
      throw error;
    }
  };
}
