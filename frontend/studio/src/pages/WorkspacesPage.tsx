import MainLayout from '../components/layout/MainLayout.tsx';
import Workspaces from '../features/workspaces/Workspaces.tsx';

export default function WorkspacesPage() {
  const breadcrumbsData = [{ label: 'Workspaces', current: true }];

  return (
    <MainLayout breadcrumbsData={breadcrumbsData}>
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Workspaces</h1>
      <Workspaces />
    </MainLayout>
  );
}
