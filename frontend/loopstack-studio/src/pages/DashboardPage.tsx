import { Home } from 'lucide-react';
import LoadingCentered from '../components/LoadingCentered.tsx';
import MainLayout from '../components/layout/MainLayout.tsx';
import { Alert } from '../components/ui/alert.tsx';
import Dashboard from '../features/dashboard/Dashboard.tsx';
import { useDashboardStats } from '../hooks/useDashboard.ts';
import { useStudio } from '../providers/StudioProvider.tsx';

export default function DashboardPage() {
  const { environment } = useStudio();

  const { data: dashboardStats, isLoading, error } = useDashboardStats();

  if (isLoading) {
    return <LoadingCentered loading={isLoading} />;
  }

  if (error) {
    return <Alert className="w-full p-4 text-red-500">Error loading dashboard: {error.message}</Alert>;
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
