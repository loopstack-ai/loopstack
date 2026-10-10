import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { HitlModule } from '@loopstack/hitl';
import { CleanupOrphanedWorkflow } from './cleanup-orphaned.workflow.js';
import { StateReportWorkflow } from './state-report.workflow.js';

/**
 * The app where host state is read and reclaimed by hand: a report of everything, and one sweep for the
 * state nothing deleted.
 *
 * Deleting a workspace or a run releases its state by itself, in the background. This is the net under that:
 * a removal that failed, or a process that died between the event and the removal, leaves state whose owning
 * row is gone — and so does a base no configuration declares any more. Nothing else looks for either.
 *
 * It is a separate import from {@link CodeWorkspaceModule} because an app is a choice: it appears in Studio
 * for everyone who imports it, and an application with its own maintenance screen would rather call
 * `WorkspaceInventoryService` from there than have this one beside it.
 *
 * Needs `CodeWorkspaceModule.forRoot`/`forRootAsync` at the app root, and `knownBaseKeys` in its options for
 * the sweep to propose bases at all.
 *
 * @public
 */
@StudioApp({
  app: 'code_workspace_maintenance',
  title: 'Workspace Maintenance',
  workflows: [StateReportWorkflow, CleanupOrphanedWorkflow],
  ui: {
    widgets: [
      // The report first: it is the only view that shows state which is not an orphan, so it is what you
      // read before deciding which workspaces to delete.
      {
        widget: 'start-form',
        options: {
          workflow: 'workspace_state_report',
          title: 'What is on disk?',
          subtitle: 'Every workspace, checkout, container and volume with its size. Read-only.',
          label: 'Report',
        },
      },
      {
        widget: 'start-form',
        options: {
          workflow: 'cleanup_orphaned',
          title: 'Reclaim orphaned state',
          subtitle: 'Find checkouts, containers, volumes and bases that nothing owns — and remove them.',
          label: 'Clean Up',
        },
      },
    ],
  },
})
@Module({
  imports: [HitlModule],
  providers: [StateReportWorkflow, CleanupOrphanedWorkflow],
})
export class CodeWorkspaceMaintenanceModule {}
