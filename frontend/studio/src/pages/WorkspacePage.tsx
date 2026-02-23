import { Home, Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.tsx';
import ErrorSnackbar from '../components/snackbars/ErrorSnackbar.tsx';
import ExecutionTimeline from '../features/workspaces/components/ExecutionTimeline.tsx';
import { useWorkspace } from '../hooks/useWorkspaces.ts';
import { useStudio } from '../providers/StudioProvider.tsx';

const WorkspacePage = () => {
  const { router } = useStudio();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const fetchWorkspace = useWorkspace(workspaceId);

  const breadcrumbData = [
    {
      label: 'Dashboard',
      href: router.getDashboard(),
      icon: <Home className="h-4 w-4" />,
    },
    { label: 'Workspaces', href: router.getWorkspaces() },
    { label: fetchWorkspace.data?.title ?? '', current: true },
  ];

  return (
    <MainLayout breadcrumbsData={breadcrumbData}>
      <>
        <h1 className="mb-4 text-3xl font-bold tracking-tight">{fetchWorkspace.data?.title ?? ''}</h1>
        {fetchWorkspace.isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : ''}
        <ErrorSnackbar error={fetchWorkspace.error} />

        {fetchWorkspace.data ? <ExecutionTimeline workspace={fetchWorkspace.data} /> : ''}
      </>
    </MainLayout>
  );
};

export default WorkspacePage;
