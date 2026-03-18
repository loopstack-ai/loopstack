import { Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { useStudio } from '@/providers/StudioProvider';

const WorkerLayout = () => {
  const location = useLocation();
  const { router } = useStudio();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ErrorBoundary key={location.pathname} onRetry={() => void router.navigateToDashboard()}>
        <Outlet />
      </ErrorBoundary>
    </div>
  );
};

export default WorkerLayout;
