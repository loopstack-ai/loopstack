import { BaseWorkflow, MessageDocument, type RunContext, Transition, Workflow } from '@loopstack/common';
import { FlakyServiceTool } from '../../tools/flaky-service.tool';

/**
 * A failure the workflow handles on its way out, which is what a run that holds something needs: the step that
 * fails declares an error place, the transition there runs on its own, gives the resource back, and ends the
 * run as failed with `this.fail(...)`.
 *
 * Two things to see. The clean-up is an **automatic** transition, so nobody has to press anything for it to
 * run, and it is told why it is there through `ctx.execution.error`. And `fail()` keeps what it did: the
 * message saying the resource came back survives, where a throw would have rolled it back.
 */
@Workflow({
  title: 'Error Handling - Error Route Example',
  description:
    'A failed step routes to a clean-up transition that runs on its own, reports what it released, and ' +
    'then ends the run as failed.',
})
export class ErrorRouteExampleWorkflow extends BaseWorkflow {
  constructor(private readonly flakyService: FlakyServiceTool) {
    super();
  }

  @Transition({ to: 'holding' })
  async takeResource() {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Took the resource this run holds.',
    });
  }

  @Transition({ from: 'holding', to: 'worked', errorPlace: 'releasing' })
  async work() {
    await this.flakyService.call({ shouldFail: true });
  }

  @Transition({ from: 'releasing', to: 'end' })
  async release(_state: Record<string, unknown>, ctx: RunContext) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Gave the resource back.',
    });
    this.fail(`The work could not be done: ${ctx.execution?.error ?? 'no reason given'}`);
  }

  @Transition({ from: 'worked', to: 'end' })
  finish() {
    this.setResult({ worked: true });
  }
}
