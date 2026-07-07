import { z } from 'zod';
import { BaseWorkflow, MarkdownDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { QuotaClientService } from '@loopstack/quota';
import { AnalyzeTextTool } from './tools/analyze-text.tool';
import type { AnalyzeTextToolResult } from './tools/analyze-text.tool';

const CustomCalculatorExampleArgsSchema = z.object({
  text: z.string().default('The quick brown fox jumps over the lazy dog'),
});

type CustomCalculatorExampleArgs = z.infer<typeof CustomCalculatorExampleArgsSchema>;

@Workflow({
  title: 'Observability - Custom Quota Calculator Example',
  description:
    'Demonstrates a custom ToolQuotaCalculator — WordsProcessedQuotaCalculator meters AnalyzeTextTool by words in the result. The built-in QuotaInterceptor checks and reports the quota automatically; the workflow only calls the tool.',
  schema: CustomCalculatorExampleArgsSchema,
})
export class CustomCalculatorExampleWorkflow extends BaseWorkflow<CustomCalculatorExampleArgs> {
  constructor(
    private readonly analyzeTextTool: AnalyzeTextTool,
    private readonly quotaClient: QuotaClientService,
  ) {
    super();
  }

  @Transition({ to: 'end' })
  async analyze(_state: object, ctx: RunContext<CustomCalculatorExampleArgs>) {
    const result = await this.analyzeTextTool.call({ text: ctx.args.text });
    const analysis = result.data as AnalyzeTextToolResult;

    const quota = await this.quotaClient.checkQuota(ctx.userId, 'words-processed');

    await this.documentStore.save(MarkdownDocument, {
      markdown: [
        '## Text Analysis',
        '',
        `- Words: \`${analysis.words}\``,
        `- Characters: \`${analysis.characters}\``,
        '',
        '## Quota `words-processed`',
        '',
        `- Used: \`${quota.used}\``,
        `- Limit: \`${quota.limit}\` (\`-1\` = unlimited / quota disabled)`,
        '',
        'The `QuotaInterceptor` charged the word count automatically via `WordsProcessedQuotaCalculator`.',
        'With `QuotaModule.forRoot({ enabled: false })` all quota calls no-op.',
      ].join('\n'),
    });
  }
}
