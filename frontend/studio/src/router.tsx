import { type DataRouter, Navigate, createBrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import WorkbenchPage from '@/pages/WorkbenchPage.tsx';
import EnvironmentEmbedRoot from './app/EnvironmentEmbedRoot.tsx';
import WorkerLayout from './app/WorkerLayout.tsx';
import { StudioSidebar } from './components/layout/StudioSidebar.tsx';
import { SidebarInset, SidebarProvider } from './components/ui/sidebar.tsx';
import config from './config.ts';
import { LocalHealthCheck } from './features/health';
import { OAuthCallbackPage } from './features/oauth';
import DashboardPage from './pages/DashboardPage.tsx';
import DebugPage from './pages/DebugPage.tsx';
import DebugWorkflowDetailsPage from './pages/DebugWorkflowDetailsPage.tsx';
import DebugWorkflowsPage from './pages/DebugWorkflowsPage.tsx';
import EmbedWorkbenchPage from './pages/EmbedWorkbenchPage.tsx';
import NotFoundPage from './pages/NotFoundPage.tsx';
import PreviewWorkbenchPage from './pages/PreviewWorkbenchPage.tsx';
import RouteErrorPage from './pages/RouteErrorPage.tsx';
import RunsListPage from './pages/RunsListPage.tsx';
import RunsPage from './pages/RunsPage.tsx';
import WorkflowDebugPage from './pages/WorkflowDebugPage.tsx';
import WorkspacePage from './pages/WorkspacePage.tsx';
import WorkspaceRunsPage from './pages/WorkspaceRunsPage.tsx';
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
      <Toaster richColors />
      <StudioProvider router={router} environment={config.environment}>
        <LocalHealthCheck />
        <SseProvider />
        <InvalidationEventsProvider />
        <SidebarProvider>
          <StudioSidebar />
          <SidebarInset>
            <WorkerLayout />
          </SidebarInset>
        </SidebarProvider>
      </StudioProvider>
    </QueryProvider>
  );
}

function EmbedRoot() {
  const router = useRouter(config.environment.id);
  return (
    <QueryProvider>
      <StudioProvider router={router} environment={config.environment}>
        <SseProvider />
        <InvalidationEventsProvider />
        <WorkerLayout />
      </StudioProvider>
    </QueryProvider>
  );
}

const router: DataRouter = createBrowserRouter([
  {
    path: '/oauth/callback',
    element: <OAuthCallbackPage />,
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/embed/env',
    element: <EnvironmentEmbedRoot />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: 'preview', element: <PreviewWorkbenchPage /> },
      { path: 'preview/workflows/:workflowId', element: <PreviewWorkbenchPage /> },
    ],
  },
  {
    path: '/embed',
    element: <EmbedRoot />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: 'workflows/:workflowId', element: <EmbedWorkbenchPage /> },
      { path: 'preview', element: <PreviewWorkbenchPage /> },
      { path: 'preview/workflows/:workflowId', element: <PreviewWorkbenchPage /> },
    ],
  },
  {
    path: '/',
    element: <AppRoot />,
    errorElement: <RouteErrorPage />,
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
        path: 'runs',
        element: <RunsListPage />,
      },
      {
        path: 'runs/action-required',
        element: <RunsPage />,
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
        path: 'workspaces/:workspaceId/runs',
        element: <WorkspaceRunsPage />,
      },
      {
        path: 'workflows/:workflowId',
        element: <WorkbenchPage />,
      },
      {
        path: 'workflows/:workflowId/debug',
        element: <WorkflowDebugPage />,
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
        path: 'workflows/:workflowId/:clickId',
        element: <WorkbenchPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);

export default router;
