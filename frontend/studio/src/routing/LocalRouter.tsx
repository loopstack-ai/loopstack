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

  getPipeline(pipelineId: string) {
    return `/pipelines/${pipelineId}`;
  }

  async navigateToPipeline(pipelineId: string) {
    await this.navigate(this.getPipeline(pipelineId));
  }

  getPipelineDebug(pipelineId: string) {
    return `/pipelines/${pipelineId}/debug`;
  }

  async navigateToPipelineDebug(pipelineId: string) {
    await this.navigate(this.getPipelineDebug(pipelineId));
  }

  async navigateToWorkflow(pipelineId: string, workflowId: string, clickId: string | undefined) {
    await this.navigate(`/pipelines/${pipelineId}/workflows/${workflowId}/${(clickId ? parseInt(clickId) : 0) + 1}`);
  }

  async navigateToPipelineNamespace(workspaceId: string, pipelineId: string, namespaceId: string) {
    await this.navigate(`/workspaces/${workspaceId}/pipelines/${pipelineId}/namespaces/${namespaceId}`);
  }

  getWorkspaceRuns(workspaceId: string) {
    return `/workspaces/${workspaceId}/runs`;
  }

  async navigateToWorkspaceRuns(workspaceId: string) {
    await this.navigate(this.getWorkspaceRuns(workspaceId));
  }

  getEmbedPipeline(pipelineId: string) {
    return `${this.embedPrefix}/pipelines/${pipelineId}`;
  }

  getPreviewPipeline(pipelineId: string) {
    return `${this.embedPrefix}/preview/pipelines/${pipelineId}`;
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
