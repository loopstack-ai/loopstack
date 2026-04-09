import { useNavigate } from 'react-router-dom';
import type { StudioRouter } from '../types';

export class LocalRouter implements StudioRouter {
  private navigate: ReturnType<typeof useNavigate>;
  private envId: string;
  private embedPrefix: string;

  constructor(navigate: ReturnType<typeof useNavigate>, envId: string, embedPrefix: string = '/embed') {
    this.navigate = navigate;
    this.envId = envId;
    this.embedPrefix = embedPrefix;
  }

  async navigateToHome() {
    await this.navigate('/');
  }

  getEnvironmentInfo() {
    return '/info';
  }

  async navigateToEnvironmentInfo() {
    await this.navigate(this.getEnvironmentInfo());
  }

  getRuns() {
    return '/runs';
  }

  getRunsActionRequired() {
    return '/runs/action-required';
  }

  getDashboard() {
    return '/dashboard';
  }

  async navigateToDashboard() {
    await this.navigate(this.getDashboard());
  }

  getWorkspaces() {
    return '/workspaces';
  }

  getDebugWorkflows() {
    return '/debug/workflows';
  }

  getDebugWorkflow(workflowId: string) {
    return `/debug/workflows/${workflowId}`;
  }

  async navigateToDebugWorkflow(workflowId: string) {
    await this.navigate(this.getDebugWorkflow(workflowId));
  }

  async navigateToWorkspaces() {
    await this.navigate(this.getWorkspaces());
  }

  getWorkspace(workspaceId: string) {
    return `/workspaces/${workspaceId}`;
  }

  async navigateToWorkspace(workspaceId: string) {
    await this.navigate(this.getWorkspace(workspaceId));
  }

  getWorkflow(workflowId: string) {
    return `/workflows/${workflowId}`;
  }

  async navigateToWorkflow(workflowId: string) {
    await this.navigate(this.getWorkflow(workflowId));
  }

  getWorkflowDebug(workflowId: string) {
    return `/workflows/${workflowId}/debug`;
  }

  async navigateToWorkflowDebug(workflowId: string) {
    await this.navigate(this.getWorkflowDebug(workflowId));
  }

  async navigateToChildWorkflow(workflowId: string, clickId: string | undefined) {
    await this.navigate(`/workflows/${workflowId}/${(clickId ? parseInt(clickId) : 0) + 1}`);
  }

  getWorkspaceRuns(workspaceId: string) {
    return `/workspaces/${workspaceId}/runs`;
  }

  async navigateToWorkspaceRuns(workspaceId: string) {
    await this.navigate(this.getWorkspaceRuns(workspaceId));
  }

  getEmbedWorkflow(workflowId: string) {
    return `${this.embedPrefix}/workflows/${workflowId}`;
  }

  getPreviewWorkflow(workflowId: string) {
    return `${this.embedPrefix}/preview/workflows/${workflowId}`;
  }

  getCurrentEnvironmentId() {
    return this.envId;
  }

  getTheme(): 'local' | 'cloud' {
    return 'local';
  }
}

export const useRouter = (envId: string, embedPrefix?: string): StudioRouter => {
  const navigate = useNavigate();
  return new LocalRouter(navigate, envId, embedPrefix);
};
