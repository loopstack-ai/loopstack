import { describe, expect, it } from 'vitest';
import { runWorkflow } from '@loopstack/testing';
import { ObservabilityExamplesModule } from '../../../observability-examples.module';
import { CustomCalculatorExampleWorkflow } from '../custom-calculator-example.workflow';
import { AnalyzeTextTool } from '../tools/analyze-text.tool';

/**
 * The counter-lesson to replay: here the tool runs *live*. The whole point is the interceptor
 * and quota calculator that fire around a real tool call, so mocking the tool would defeat the
 * test. Importing the app module wires up the `QuotaInterceptor` and registers the custom
 * calculator; `QuotaModule.forRoot({ enabled: false })` makes quota a no-op, so no Redis.
 */
describe('CustomCalculatorExampleWorkflow', () => {
  it('runs the analyze tool live and reports the analysis with quota disabled', async () => {
    const run = await runWorkflow(
      CustomCalculatorExampleWorkflow,
      { text: 'The quick brown fox jumps over the lazy dog' },
      { imports: [ObservabilityExamplesModule], providers: [AnalyzeTextTool] },
    );

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    const markdown = run.documents.map((d) => (d.content as { markdown?: string }).markdown ?? '').join('\n');
    expect(markdown).toContain('- Words: `9`');
    expect(markdown).toContain('- Limit: `-1`');
  });
});
