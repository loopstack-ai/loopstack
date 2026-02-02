import { Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useStudio } from '@/providers/StudioProvider';

const WorkerLayout = () => {
  const location = useLocation();
  const { router } = useStudio();

  return (
    <div className="flex min-h-screen flex-1 flex-col p-2">
      <ErrorBoundary key={location.pathname} onRetry={() => void router.navigateToDashboard()}>
        <Outlet />
      </ErrorBoundary>
    </div>
  );
};

export default WorkerLayout;
