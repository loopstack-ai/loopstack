import { Home, TriangleAlert } from 'lucide-react';
import LoadingCentered from '@/components/feedback/LoadingCentered';
import MainLayout from '../components/layout/MainLayout.tsx';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert.tsx';
import { Button } from '../components/ui/button.tsx';
import Dashboard from '../features/dashboard/Dashboard.tsx';
import { useDashboardStats } from '../hooks/useDashboard.ts';
import { useStudio } from '../providers/StudioProvider.tsx';

export default function DashboardPage() {
  const { environment } = useStudio();

  const { data: dashboardStats, isLoading, error, refetch, isRefetching } = useDashboardStats();

  if (isLoading) {
    return <LoadingCentered loading={isLoading} />;
  }

  if (error) {
    const breadcrumbsData = [
      {
        label: environment.name,
        href: '#',
        icon: <Home className="h-4 w-4" />,
      },
      { label: 'Dashboard', current: true },
    ];

    return (
      <MainLayout breadcrumbsData={breadcrumbsData}>
        <h1 className="mb-4 text-3xl font-bold tracking-tight">Dashboard</h1>

        <div className="mx-auto w-full max-w-2xl">
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>Dashboard konnte nicht geladen werden</AlertTitle>
            <AlertDescription>
              <p className="wrap-break-word">Bitte versuch’s nochmal. {error.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="destructive" onClick={() => void refetch()} disabled={isRefetching}>
                  {isRefetching ? 'Lade neu…' : 'Neu versuchen'}
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

  const breadcrumbsData = [
    {
      label: environment.name,
      href: '#',
      icon: <Home className="h-4 w-4" />,
    },
    { label: 'Dashboard', current: true },
  ];

  return (
    <MainLayout breadcrumbsData={breadcrumbsData}>
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Dashboard</h1>

      <Dashboard dashboardStats={dashboardStats} />
    </MainLayout>
  );
}
