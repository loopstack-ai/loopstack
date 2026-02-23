import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiClientEvents } from '@/events';
import { useGetHealthInfo, useWorkerAuth, useWorkerAuthTokenRefresh } from '@/hooks/useAuth.ts';
import { eventBus } from '@/services';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet.tsx';
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

  return (
    <Sheet open={escalation >= Escalation.Debug}>
      <SheetContent side="bottom">
        <SheetHeader>
          <div className="flex w-full flex-row items-center justify-between">
            <div>
              <SheetTitle>Connection issues detected</SheetTitle>
              <SheetDescription>
                Please make sure the environment{' '}
                <strong>
                  {environment.name} ({environment.id})
                </strong>{' '}
                is properly configured and running.
              </SheetDescription>
            </div>

            {escalation === Escalation.Connection && (
              <div className="mr-10">
                <button
                  onClick={handleCheckHealth}
                  className="bg-primary flex items-center gap-2 rounded-md px-4 py-2 text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${fetchHealthInfo.isLoading ? 'animate-spin' : ''}`} />
                  Retry
                </button>
              </div>
            )}
          </div>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
};

export default LocalHealthCheck;
