import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiClientEvents } from '@/events';
import { useGetHealthInfo, useWorkerAuth, useWorkerAuthTokenRefresh } from '@/hooks/useAuth.ts';
import { eventBus } from '@/services';
import { useStudio } from '../../providers/StudioProvider.tsx';

export const Escalation = {
  None: 0,
  Refresh: 1,
  Login: 2,
  Debug: 3,
  Connection: 4,
} as const;

export type Escalation = (typeof Escalation)[keyof typeof Escalation];

const LocalHealthCheck = () => {
  const { environment } = useStudio();

  const [escalation, setEscalation] = useState<Escalation>(Escalation.None);

  const authenticateWorker = useWorkerAuth();
  const tokenRefresh = useWorkerAuthTokenRefresh();
  const fetchHealthInfo = useGetHealthInfo(false);
  const queryClient = useQueryClient();

  // Stabilize mutation references to avoid infinite loops.
  const tokenRefreshRef = useRef(tokenRefresh);
  tokenRefreshRef.current = tokenRefresh;

  const authenticateWorkerRef = useRef(authenticateWorker);
  authenticateWorkerRef.current = authenticateWorker;

  const fetchHealthInfoRef = useRef(fetchHealthInfo);
  fetchHealthInfoRef.current = fetchHealthInfo;

  const handleCheckHealth = useCallback(() => {
    void fetchHealthInfoRef.current.refetch();
  }, []);

  const handleTokenRefresh = useCallback(() => {
    tokenRefreshRef.current.mutate();
  }, []);

  const handleLogin = useCallback(async () => {
    try {
      let idToken = 'local';
      if (environment.getIdToken) {
        idToken = await environment.getIdToken();
      }
      authenticateWorkerRef.current.mutate({
        hubLoginRequestDto: { idToken },
      });
    } catch {
      setEscalation(Escalation.Debug);
    }
  }, [environment]);

  // Poll health endpoint when in Connection escalation
  useEffect(() => {
    if (escalation !== Escalation.Connection) return;

    const interval = setInterval(handleCheckHealth, 5000);
    return () => clearInterval(interval);
  }, [escalation, handleCheckHealth]);

  // Reset escalation when health check succeeds
  useEffect(() => {
    if (fetchHealthInfo.data) {
      setEscalation(Escalation.None);
      void queryClient.invalidateQueries();
    }
  }, [fetchHealthInfo.data, queryClient]);

  // Token refresh error → escalate to Login
  useEffect(() => {
    if (tokenRefresh.error) {
      setEscalation(Escalation.Login);
    }
  }, [tokenRefresh.error]);

  // Token refresh success → clear escalation
  useEffect(() => {
    if (tokenRefresh.data?.status === 200) {
      setEscalation(Escalation.None);
    }
  }, [tokenRefresh.data]);

  // Login error → escalate to Debug
  useEffect(() => {
    if (authenticateWorker.error) {
      setEscalation(Escalation.Debug);
    }
  }, [authenticateWorker.error]);

  // Login success → clear escalation
  useEffect(() => {
    if (authenticateWorker.data?.status === 200) {
      setEscalation(Escalation.None);
    }
  }, [authenticateWorker.data]);

  // Act on escalation level changes
  useEffect(() => {
    if (escalation === Escalation.Refresh) {
      handleTokenRefresh();
    } else if (escalation === Escalation.Login) {
      void handleLogin();
    }
  }, [escalation, handleTokenRefresh, handleLogin]);

  // Subscribe to events
  useEffect(() => {
    const unsubscribe1 = eventBus.on(ApiClientEvents.UNAUTHORIZED, () => {
      setEscalation(Escalation.Refresh);
    });
    const unsubscribe2 = eventBus.on(ApiClientEvents.ERR_NETWORK, () => {
      setEscalation(Escalation.Connection);
    });
    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, []);

  const [dismissed, setDismissed] = useState(false);
  const isVisible = escalation >= Escalation.Debug && !dismissed;

  // Reset dismissed state when escalation clears
  useEffect(() => {
    if (escalation < Escalation.Debug) {
      setDismissed(false);
    }
  }, [escalation]);

  if (!isVisible) return null;

  return (
    <div className="bg-destructive/10 border-destructive/30 fixed inset-x-0 bottom-0 z-50 border-t px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-destructive h-2 w-2 rounded-full" />
          <div>
            <p className="text-foreground text-sm font-semibold">Connection issues detected</p>
            <p className="text-muted-foreground text-xs">
              Please make sure the environment{' '}
              <strong>
                {environment.name} ({environment.id})
              </strong>{' '}
              is properly configured and running.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {escalation === Escalation.Connection && (
            <button
              onClick={handleCheckHealth}
              className="bg-primary flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${fetchHealthInfo.isLoading ? 'animate-spin' : ''}`} />
              Retry
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground rounded-xs p-1 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocalHealthCheck;
