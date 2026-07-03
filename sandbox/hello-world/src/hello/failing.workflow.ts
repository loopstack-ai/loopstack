import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';

/**
 * Fails on purpose — exercises error handling and non-zero exit codes in
 * clients (e.g. `loopstack run failing` must exit 1).
 */
@Workflow({
  title: 'Failing Workflow',
  description:
    'Throws immediately — for testing error handling and CI exit codes.',
})
export class FailingWorkflow extends BaseWorkflow {
  @Transition({ from: 'start', to: 'end' })
  explode() {
    throw new Error('This workflow fails on purpose.');
  }
}
