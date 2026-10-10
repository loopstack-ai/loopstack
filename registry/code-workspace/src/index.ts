/**
 * `code-workspace` — an in-project, package-style module that provisions isolated per-workflow checkouts of
 * a codebase from a shared base and runs them in disposable containers. Domain-neutral: no Claude, no
 * app-runner, no agent specifics. Consume it via the {@link CODE_WORKSPACE_PROVISIONER} token.
 */
export { CodeWorkspaceModule } from './code-workspace.module.js';
export type { CodeWorkspaceModuleAsyncOptions } from './code-workspace.module.js';
export { CODE_WORKSPACE_OPTIONS, DEFAULT_NAMESPACE } from './code-workspace.options.js';
export type { CodeWorkspaceOptions, ResolvedCodeWorkspaceOptions } from './code-workspace.options.js';
export { CODE_WORKSPACE_PROVISIONER } from './code-workspace.provisioner.js';
export { baseResource } from './base-resource.js';
export { RepoGitClient } from './repo-git-client.js';
export { CleanupOrphanedWorkflow } from './cleanup-orphaned.workflow.js';
export { StateReportWorkflow } from './state-report.workflow.js';
export { CodeWorkspaceMaintenanceModule } from './code-workspace-maintenance.module.js';
export { WorkspaceCleanupListener } from './workspace-cleanup.listener.js';
export { WorkspaceInventoryService, formatBytes } from './workspace-inventory.service.js';
export type {
  CheckoutInventory,
  ContainerInventory,
  Inventory,
  OrphanPlan,
  VolumeInventory,
  WorkspaceInventory,
} from './workspace-inventory.service.js';
export { SEED_IMAGES_MOUNT, bindSeedImages } from './seed-images.js';
export { parseShortStat } from './short-stat.js';
export type { RepoChangeCount } from './short-stat.js';
export type {
  BaseBuildOwner,
  BaseGenerationInfo,
  BaseStateInfo,
  CheckoutInfo,
  CheckoutRepo,
  CodeWorkspaceProvisioner,
  ContainerInfo,
  VolumeInfo,
  ProvisionOptions,
  ProvisionedContainer,
  RepoChanges,
  SharedStateInfo,
  WorkflowCheckout,
  WorkspaceStateInfo,
} from './code-workspace.provisioner.js';
