import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { createClient } from '@loopstack/client';
import { LoopstackProvider, useLiveInvalidation } from '@loopstack/react';
import { useMe } from '../hooks/useAuth.ts';
import { createReportingFetch } from '../services/reporting-fetch.ts';
import { useStudio } from './StudioProvider.tsx';

/**
 * Binds the live event stream to the query cache. Mounted only once
 * authenticated: the first subscription opens the SSE connection.
 */
function LiveInvalidation() {
  useLiveInvalidation();
  return null;
}

/**
 * Provides the Loopstack SDK client for the current Studio environment.
 * The stream connection is ref-counted by its subscribers — no explicit
 * teardown is needed when the environment changes.
 */
export function LoopstackClientProvider({ children }: { children?: ReactNode }) {
  const { environment } = useStudio();
  const { isSuccess: isAuthenticated } = useMe();

  const client = useMemo(
    () =>
      createClient({
        url: environment.url,
        envKey: environment.id,
        credentials: 'include',
        fetch: createReportingFetch(environment.id),
      }),
    [environment.id, environment.url],
  );

  return (
    <LoopstackProvider client={client}>
      {isAuthenticated ? <LiveInvalidation /> : null}
      {children}
    </LoopstackProvider>
  );
}
