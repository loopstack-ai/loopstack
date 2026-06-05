import LoadingCentered from '@/components/feedback/LoadingCentered';
import MainLayout from '../components/layout/MainLayout.tsx';
import AppLauncher from '../features/dashboard/AppLauncher.tsx';
import { useAppsConfig } from '../hooks/useConfig.ts';

export default function DashboardPage() {
  const { data: apps, isLoading } = useAppsConfig();

  if (isLoading) {
    return <LoadingCentered loading={isLoading} />;
  }

  const breadcrumbsData = [{ label: 'Applications', current: true }];

  return (
    <MainLayout breadcrumbsData={breadcrumbsData}>
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Applications</h1>

      {apps && apps.length > 0 && <AppLauncher apps={apps} />}
    </MainLayout>
  );
}
