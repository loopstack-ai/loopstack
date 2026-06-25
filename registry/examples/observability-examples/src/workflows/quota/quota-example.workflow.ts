import { z } from 'zod';
import { BaseWorkflow, MarkdownDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { QuotaClientService } from '@loopstack/quota';

interface QuotaExampleState {
  hasQuota?: boolean;
  used?: number;
  limit?: number;
}

const QuotaExampleArgsSchema = z.object({
  quotaType: z.string().default('ai_generate_text'),
  reportAmount: z.number().default(1000),
});

type QuotaExampleArgs = z.infer<typeof QuotaExampleArgsSchema>;

@Workflow({
  title: 'Observability - Quota Example',
  description:
    'Demonstrates opt-in quota tracking with @loopstack/quota — check available budget before an operation, then report usage afterward. Backed by Redis when enabled in QuotaModule.forRoot.',
  schema: QuotaExampleArgsSchema,
})
export class QuotaExampleWorkflow extends BaseWorkflow<QuotaExampleArgs> {
  constructor(private readonly quotaClient: QuotaClientService) {
    super();
  }

  @Transition({ to: 'quota_checked' })
  async checkQuota(_state: QuotaExampleState, ctx: RunContext<QuotaExampleArgs>) {
    const result = await this.quotaClient.checkQuota(ctx.userId ?? 'anonymous', ctx.args.quotaType);

    const allowed = !result.exceeded;
    await this.documentStore.save(MarkdownDocument, {
      markdown: [
        '## Quota Check',
        '',
        `- Allowed: \`${allowed}\``,
        `- Used: \`${result.used}\``,
        `- Limit: \`${result.limit}\``,
      ].join('\n'),
    });

    this.assignState({ hasQuota: allowed, used: result.used, limit: result.limit });
  }

  @Transition({ from: 'quota_checked', to: 'end' })
  async reportUsage(_state: QuotaExampleState, ctx: RunContext<QuotaExampleArgs>) {
    if (!_state.hasQuota) {
      await this.documentStore.save(MarkdownDocument, {
        markdown: '## Skipped\n\nQuota exhausted — operation not performed.',
      });
      return;
    }

    await this.quotaClient.report(ctx.userId ?? 'anonymous', ctx.args.quotaType, ctx.args.reportAmount);

    await this.documentStore.save(MarkdownDocument, {
      markdown: [
        '## Reported',
        '',
        `Charged \`${ctx.args.reportAmount}\` units of \`${ctx.args.quotaType}\` to the user's quota.`,
      ].join('\n'),
    });
  }
}
