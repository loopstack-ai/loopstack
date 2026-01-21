export interface Environment {
  id: string;
  name: string;
  url: string;
}

export interface StudioRouter {
  navigateToHome(): void;
  navigateToEnvironmentInfo(): void;
  getDashboard(): string;
  navigateToDashboard(): void;
  getWorkspaces(): string;
  navigateToWorkspaces(): void;
  getWorkspace(workspaceId: string): string;
  navigateToWorkspace(workspaceId: string): void;
  getPipeline(pipelineId: string): string;
  navigateToPipeline(pipelineId: string): void;
  getPipelineDebug(pipelineId: string): string;
  navigateToPipelineDebug(pipelineId: string): void;
  navigateToWorkflow(pipelineId: string, workflowId: string, clickId: string | undefined): void;
  navigateToPipelineNamespace(workspaceId: string, pipelineId: string, namespaceId: string): void;
  getCurrentEnvironmentId(): string;
  getTheme(): 'local' | 'cloud';
}
