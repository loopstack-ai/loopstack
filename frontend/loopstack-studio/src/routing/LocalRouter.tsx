import { useNavigate } from 'react-router-dom';
import type { StudioRouter } from '../types';

export class LocalRouter implements StudioRouter {
  private navigate: ReturnType<typeof useNavigate>;
  private envId: string;

  constructor(navigate: ReturnType<typeof useNavigate>, envId: string) {
    this.navigate = navigate;
    this.envId = envId;
  }

  navigateToHome() {
    this.navigate('/');
  }

  navigateToEnvironmentInfo() {
    this.navigate('/info');
  }

  getDashboard() {
    return '/dashboard';
  }

  navigateToDashboard() {
    this.navigate(this.getDashboard());
  }

  getWorkspaces() {
    return '/workspaces';
  }

  navigateToWorkspaces() {
    this.navigate(this.getWorkspaces());
  }

  getWorkspace(workspaceId: string) {
    return `/workspaces/${workspaceId}`;
  }

  navigateToWorkspace(workspaceId: string) {
    this.navigate(this.getWorkspace(workspaceId));
  }

  getPipeline(pipelineId: string) {
    return `/pipelines/${pipelineId}`;
  }

  navigateToPipeline(pipelineId: string) {
    this.navigate(this.getPipeline(pipelineId));
  }

  navigateToWorkflow(pipelineId: string, workflowId: string, clickId: string | undefined) {
    this.navigate(`/pipelines/${pipelineId}/workflows/${workflowId}/${(clickId ? parseInt(clickId) : 0) + 1}`);
  }

  navigateToPipelineNamespace(workspaceId: string, pipelineId: string, namespaceId: string) {
    this.navigate(`/workspaces/${workspaceId}/pipelines/${pipelineId}/namespaces/${namespaceId}`);
  }

  getCurrentEnvironmentId() {
    return this.envId;
  }

  getTheme(): 'local' | 'cloud' {
    return 'local';
  }
}

export const useRouter = (envId: string): StudioRouter => {
  const navigate = useNavigate();
  return new LocalRouter(navigate, envId);
};
