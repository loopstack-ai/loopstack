export interface Environment {
  id: string;
  name: string;
  url: string;
  getIdToken?: () => Promise<string>;
}

export interface StudioRouter {
  navigateToHome(): Promise<void>;
  navigateToEnvironmentInfo(): Promise<void>;
  getDashboard(): string;
  navigateToDashboard(): Promise<void>;
  getWorkspaces(): string;
  getDebugWorkflows(): string;
  getDebugWorkflow(workflowId: string): string;
  navigateToDebugWorkflow(workflowId: string): Promise<void>;
  navigateToWorkspaces(): Promise<void>;
  getWorkspace(workspaceId: string): string;
  navigateToWorkspace(workspaceId: string): Promise<void>;
  getPipeline(pipelineId: string): string;
  navigateToPipeline(pipelineId: string): Promise<void>;
  getPipelineDebug(pipelineId: string): string;
  navigateToPipelineDebug(pipelineId: string): Promise<void>;
  navigateToWorkflow(pipelineId: string, workflowId: string, clickId: string | undefined): Promise<void>;
  navigateToPipelineNamespace(workspaceId: string, pipelineId: string, namespaceId: string): Promise<void>;
  getCurrentEnvironmentId(): string;
  getTheme(): 'local' | 'cloud';
}
