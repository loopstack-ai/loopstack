import { Navigate, createBrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import WorkbenchPage from '@/pages/WorkbenchPage.tsx';
import WorkerLayout from './app/WorkerLayout.tsx';
import AppLayout from './components/layout/AppLayout.tsx';
import config from './config.ts';
import LocalHealthCheck from './features/health/LocalHealthCheck.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import DebugPage from './pages/DebugPage.tsx';
import DebugWorkflowDetailsPage from './pages/DebugWorkflowDetailsPage.tsx';
import DebugWorkflowsPage from './pages/DebugWorkflowsPage.tsx';
import PipelineDebugPage from './pages/PipelineDebugPage.tsx';
import WorkspacePage from './pages/WorkspacePage.tsx';
import WorkspacesPage from './pages/WorkspacesPage.tsx';
import { InvalidationEventsProvider } from './providers/InvalidationEventsProvider.tsx';
import { QueryProvider } from './providers/QueryProvider.tsx';
import { SseProvider } from './providers/SseProvider.tsx';
import { StudioProvider } from './providers/StudioProvider.tsx';
import { useRouter } from './routing/LocalRouter.tsx';

function AppRoot() {
  const router = useRouter(config.environment.id);
  return (
    <QueryProvider>
      <AppLayout>
        <Toaster richColors />
        <StudioProvider router={router} environment={config.environment}>
          <LocalHealthCheck />
          <SseProvider />
          <InvalidationEventsProvider />
          <WorkerLayout />
        </StudioProvider>
      </AppLayout>
    </QueryProvider>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppRoot />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'info',
        element: <DebugPage />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'workspaces',
        element: <WorkspacesPage />,
      },
      {
        path: 'workspaces/:workspaceId',
        element: <WorkspacePage />,
      },
      {
        path: 'pipelines/:pipelineId',
        element: <WorkbenchPage />,
      },
      {
        path: 'pipelines/:pipelineId/debug',
        element: <PipelineDebugPage />,
      },
      {
        path: 'debug/workflows',
        element: <DebugWorkflowsPage />,
      },
      {
        path: 'debug/workflows/:workflowId',
        element: <DebugWorkflowDetailsPage />,
      },
      {
        path: 'pipelines/:pipelineId/workflows/:workflowId/:clickId?',
        element: <WorkbenchPage />,
      },
      {
        path: 'pipelines/:pipelineId/namespaces/:namespaceId/w/:workflowId',
        element: <WorkbenchPage />,
      },
    ],
  },
]);

export default router;
