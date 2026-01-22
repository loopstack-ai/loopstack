import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet.tsx';
import { ApiClientEvents } from '../../events';
import { useGetHealthInfo, useWorkerAuth, useWorkerAuthTokenRefresh } from '../../hooks/useAuth.ts';
import { useStudio } from '../../providers/StudioProvider.tsx';
import { eventBus } from '../../services';

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

  const handleCheckHealth = useCallback(() => {
    void fetchHealthInfo.refetch();
  }, [fetchHealthInfo]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (escalation === Escalation.Connection) {
      interval = setInterval(() => {
        handleCheckHealth();
      }, 5000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [escalation, handleCheckHealth]);

  useEffect(() => {
    if (fetchHealthInfo.data) {
      setEscalation(Escalation.None);
      void queryClient.invalidateQueries();
    }
  }, [fetchHealthInfo.data, setEscalation, queryClient]);

  const handleTokenRefresh = useCallback(() => {
    tokenRefresh.mutate();
  }, [tokenRefresh]);

  const handleLogin = useCallback(() => {
    authenticateWorker.mutate({
      hubLoginRequestDto: {
        code: 'local',
        grantType: 'local',
      },
    });
  }, [authenticateWorker]);

  useEffect(() => {
    if (tokenRefresh.error) {
      setEscalation(Escalation.Login);
    }
  }, [tokenRefresh.error]);

  useEffect(() => {
    if (tokenRefresh.data?.status === 200) {
      setEscalation(Escalation.None);
    }
  }, [tokenRefresh.data]);

  useEffect(() => {
    if (authenticateWorker.error) {
      setEscalation(Escalation.Debug);
    }
  }, [authenticateWorker.error]);

  useEffect(() => {
    if (authenticateWorker.data?.status === 200) {
      setEscalation(Escalation.None);
    }
  }, [authenticateWorker.data]);

  useEffect(() => {
    if (escalation === Escalation.Refresh) {
      handleTokenRefresh();
    } else if (escalation === Escalation.Login) {
      handleLogin();
    }
  }, [escalation, handleTokenRefresh, handleLogin]);

  // Subscribe to events
  useEffect(() => {
    const handleUnauthorized = () => {
      setEscalation(Escalation.Refresh);
    };

    const handleConnectionRefused = () => {
      setEscalation(Escalation.Connection);
    };

    const unsubscribe1 = eventBus.on(ApiClientEvents.UNAUTHORIZED, handleUnauthorized);
    const unsubscribe2 = eventBus.on(ApiClientEvents.ERR_NETWORK, handleConnectionRefused);
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
