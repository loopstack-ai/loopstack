import { ApiClientEvents, apiClientEvents } from '@/events';

/**
 * How long a request may wait before it is treated as stuck.
 *
 * No endpoint does long work inside the request: running a workflow reads it, marks it pending and enqueues
 * a task, and the transition itself — with whatever it calls out to — runs in the worker, where its failures
 * are reported. A request is therefore a handful of queries and an enqueue, so anything still outstanding
 * after a couple of seconds is not the server thinking.
 */
const STALL_AFTER_MS = 2_000;

/** The event stream is a fetch too, and by design it never settles — timing it would alarm immediately. */
function isEventStream(input: RequestInfo | URL, init?: RequestInit): boolean {
  const accept = new Headers(init?.headers).get('Accept') ?? '';
  if (accept.includes('text/event-stream')) return true;
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return url.includes('/sse/stream');
}

/**
 * Reports API transport trouble of the SDK's requests (REST and event stream) into the health-check
 * escalation flow: authentication failures, network errors, and requests that simply never come back.
 *
 * That last case has no event of its own. A browser allows only a handful of connections per origin over
 * HTTP/1.1, and Studio holds one of them open per window for the event stream — so with enough windows open
 * a new request is queued by the browser and never sent. It does not fail, it waits, which is
 * indistinguishable from a slow server until someone closes a window. Timing the request is the only signal
 * available, so that is what is reported.
 */
export function createReportingFetch(environmentId: string): typeof fetch {
  // Requests currently past the stall threshold. The banner stays up while any of them is outstanding.
  const stalled = new Set<number>();
  let nextId = 0;

  return async (input, init) => {
    const id = nextId++;
    const timed = !isEventStream(input, init);
    const timer = timed
      ? setTimeout(() => {
          stalled.add(id);
          if (stalled.size === 1) apiClientEvents.emit(ApiClientEvents.REQUEST_STALLED, environmentId);
        }, STALL_AFTER_MS)
      : undefined;

    const settle = (): void => {
      if (timer !== undefined) clearTimeout(timer);
      if (!stalled.delete(id)) return;
      if (stalled.size === 0) apiClientEvents.emit(ApiClientEvents.REQUEST_RECOVERED, environmentId);
    };

    try {
      const response = await fetch(input, init);
      settle();
      if (response.status === 401 || response.status === 403) {
        apiClientEvents.emit(ApiClientEvents.UNAUTHORIZED, environmentId);
      }
      return response;
    } catch (error) {
      settle();
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        apiClientEvents.emit(ApiClientEvents.ERR_NETWORK, environmentId);
      }
      throw error;
    }
  };
}
