import { Home } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout.tsx';
import Runs from '../features/runs/Runs.tsx';
import { useStudio } from '../providers/StudioProvider.tsx';

export default function RunsListPage() {
  const { router } = useStudio();

  const breadcrumbsData = [
    {
      label: 'Dashboard',
      href: router.getDashboard(),
      icon: <Home className="h-4 w-4" />,
    },
    { label: 'Runs', current: true },
  ];

  return (
    <MainLayout breadcrumbsData={breadcrumbsData}>
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Runs</h1>
      <Runs />
    </MainLayout>
  );
}
