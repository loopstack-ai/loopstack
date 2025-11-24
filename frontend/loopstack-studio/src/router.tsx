import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

import { useRouter } from './routing/LocalRouter.tsx';
import { QueryProvider } from './providers/QueryProvider.tsx';
import AppLayout from './components/layout/AppLayout.tsx';
import WorkerLayout from './app/WorkerLayout.tsx';
import config from './config.ts';
import DashboardPage from './pages/DashboardPage.tsx';
import { StudioProvider } from './providers/StudioProvider.tsx';
import WorkspacePage from './pages/WorkspacePage.tsx';
import LocalHealthCheck from './features/health/LocalHealthCheck.tsx';
import DebugPage from './pages/DebugPage.tsx';
import { SseProvider } from './providers/SseProvider.tsx';
import { InvalidationEventsProvider } from './providers/InvalidationEventsProvider.tsx';
import WorkspacesPage from './pages/WorkspacesPage.tsx';
import WorkbenchPage from '@/pages/WorkbenchPage.tsx';

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
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: 'info',
        element: <DebugPage />
      },
      {
        path: 'dashboard',
        element: <DashboardPage />
      },
      {
        path: 'workspaces',
        element: <WorkspacesPage />
      },
      {
        path: 'workspaces/:workspaceId',
        element: <WorkspacePage />
      },
      {
        path: 'pipelines/:pipelineId',
        element: <WorkbenchPage />
      },
      {
        path: 'pipelines/:pipelineId/workflows/:workflowId/:clickId?',
        element: <WorkbenchPage />
      },
      {
        path: 'pipelines/:pipelineId/namespaces/:namespaceId/w/:workflowId',
        element: <WorkbenchPage />
      }
    ]
  }
]);

export default router;
