import { useParams } from 'react-router-dom';
import { useWorkspace } from '../../../hooks/useWorkspaces.ts';
import ErrorSnackbar from '../../../components/snackbars/ErrorSnackbar';
import { Home, Loader2 } from 'lucide-react';
import MainLayout from '../../../components/layout/MainLayout.tsx';
import ExecutionTimeline from './ExecutionTimeline.tsx';
import { useStudio } from '../../../providers/StudioProvider.tsx';

const Workspace = () => {
  const { router } = useStudio();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const fetchWorkspace = useWorkspace(workspaceId);

  const breadcrumbData = [
    {
      label: 'Dashboard',
      href: router.getDashboard(),
      icon: <Home className="h-4 w-4" />
    },
    { label: 'Workspaces', href: router.getWorkspaces() },
    { label: fetchWorkspace.data?.title ?? '' },
    { label: 'Timeline', current: true }
  ];

  return (
    <MainLayout breadcrumbsData={breadcrumbData}>
      <>
        {fetchWorkspace.isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : ''}
        <ErrorSnackbar error={fetchWorkspace.error} />

        {fetchWorkspace.data ? <ExecutionTimeline workspace={fetchWorkspace.data} /> : ''}
      </>
    </MainLayout>
  );
};

export default Workspace;
