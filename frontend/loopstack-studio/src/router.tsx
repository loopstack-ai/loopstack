import { createBrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { useRouter } from './routing/LocalRouter.tsx';
import { QueryProvider } from './providers/QueryProvider.tsx';
import AppLayout from './components/layout/AppLayout.tsx';
import WorkerLayout from './app/WorkerLayout.tsx';
import config from './config.ts';
import DashboardPage from './pages/DashboardPage.tsx';
import { StudioProvider } from './providers/StudioProvider.tsx';
import Workspaces from './features/workspaces/Workspaces.tsx';
import Workspace from './features/workspaces/Workspaces/Workspace.tsx';
import LocalHealthCheck from './features/health/LocalHealthCheck.tsx';
import DebugPage from './pages/DebugPage.tsx';
import Workbench from './features/workbench/Workbench.tsx';
import { SseProvider } from './providers/SseProvider.tsx';

function AppRoot() {
  const router = useRouter(config.environment.id);
  return (
    <QueryProvider>
      <AppLayout>
        <Toaster richColors />
        <StudioProvider router={router} environment={config.environment}>
          <LocalHealthCheck />
          <SseProvider />
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
        path: 'info',
        element: <DebugPage />
      },
      {
        path: 'dashboard',
        element: <DashboardPage />
      },
      {
        path: 'workspaces',
        element: <Workspaces />
      },
      {
        path: 'workspaces/:workspaceId',
        element: <Workspace />
      },
      {
        path: 'pipelines/:pipelineId',
        element: <Workbench />
      },
      {
        path: 'pipelines/:pipelineId/workflows/:workflowId/:clickId?',
        element: <Workbench />
      },
      {
        path: 'pipelines/:pipelineId/namespaces/:namespaceId/w/:workflowId',
        element: <Workbench />
      }
    ]
  }
]);

export default router;
