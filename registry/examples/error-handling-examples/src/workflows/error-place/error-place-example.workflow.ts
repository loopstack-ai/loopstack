import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { FlakyServiceTool } from '../../tools/flaky-service.tool';

/**
 * errorPlace: when the service call fails, the workflow moves to `service_failed` instead of
 * staying put. A wait transition from that place (the Recover button) continues the run.
 */
@Workflow({
  title: 'Error Handling - Error Place Example',
  description:
    'Custom error place: the failing service call routes the workflow to a recovery place. ' +
    'Click "Recover" to run the recovery transition.',
  widget: './error-place-example.ui.yaml',
})
export class ErrorPlaceExampleWorkflow extends BaseWorkflow {
  constructor(private readonly flakyService: FlakyServiceTool) {
    super();
  }

  @Transition({ to: 'end', errorPlace: 'service_failed' })
  async callService() {
    await this.flakyService.call({ shouldFail: true });
  }

  @Transition({ from: 'service_failed', to: 'end', wait: true })
  async recover() {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Recovered from the service failure via the error place.',
    });
    this.setResult({ recovered: true });
  }
}
