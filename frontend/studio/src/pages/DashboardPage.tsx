import { TriangleAlert } from 'lucide-react';
import LoadingCentered from '@/components/feedback/LoadingCentered';
import MainLayout from '../components/layout/MainLayout.tsx';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert.tsx';
import { Button } from '../components/ui/button.tsx';
import Dashboard from '../features/dashboard/Dashboard.tsx';
import { useDashboardStats } from '../hooks/useDashboard.ts';

export default function DashboardPage() {
  const { data: dashboardStats, isLoading, error, refetch, isRefetching } = useDashboardStats();

  if (isLoading) {
    return <LoadingCentered loading={isLoading} />;
  }

  if (error) {
    const breadcrumbsData = [{ label: 'Dashboard', current: true }];

    return (
      <MainLayout breadcrumbsData={breadcrumbsData}>
        <h1 className="mb-4 text-3xl font-bold tracking-tight">Dashboard</h1>

        <div className="mx-auto w-full max-w-2xl">
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>Failed to load dashboard</AlertTitle>
            <AlertDescription>
              <p className="wrap-break-word">Please try again. {error.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="destructive" onClick={() => void refetch()} disabled={isRefetching}>
                  {isRefetching ? 'Reloading…' : 'Retry'}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  if (!dashboardStats) {
    return <div className="p-4">No data available</div>;
  }

  const breadcrumbsData = [{ label: 'Dashboard', current: true }];

  return (
    <MainLayout breadcrumbsData={breadcrumbsData}>
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Dashboard</h1>

      <Dashboard dashboardStats={dashboardStats} />
    </MainLayout>
  );
}
