import { Home } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout.tsx';
import Workspaces from '../features/workspaces/Workspaces.tsx';
import { useStudio } from '../providers/StudioProvider.tsx';

export default function WorkspacesPage() {
  const { router } = useStudio();

  const breadcrumbsData = [
    {
      label: 'Dashboard',
      href: router.getDashboard(),
      icon: <Home className="h-4 w-4" />,
    },
    { label: 'Workspaces', current: true },
  ];

  return (
    <MainLayout breadcrumbsData={breadcrumbsData}>
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Workspaces</h1>
      <Workspaces />
    </MainLayout>
  );
}
