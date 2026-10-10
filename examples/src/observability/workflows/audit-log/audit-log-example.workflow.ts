import { BaseWorkflow, MarkdownDocument, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { AuditLogService } from './services/audit-log.service';

@Workflow({
  title: 'Observability - Audit Log Example',
  description:
    'Demonstrates subscribing to framework events — an @OnEvent("client.message") listener records every workflow and document lifecycle event into an injectable service. The workflow emits a few events, then renders its own audit trail.',
})
export class AuditLogExampleWorkflow extends BaseWorkflow {
  constructor(private readonly auditLog: AuditLogService) {
    super();
  }

  @Transition({ to: 'auditing' })
  async doWork() {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Doing some work — each saved document emits a `document.created` event.',
    });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'The audit listener captures these events app-wide.',
    });
  }

  @Transition({ from: 'auditing', to: 'end' })
  async renderAudit(_state: object, ctx: RunContext) {
    const entries = this.auditLog.forWorkflow(ctx.workflowId);

    await this.documentStore.save(MarkdownDocument, {
      markdown: [
        '## Audit Trail',
        '',
        `Captured by \`AuditListener\` via \`@OnEvent('client.message')\` for workflow \`${ctx.workflowId}\`.`,
        '',
        '| Event type | User |',
        '| ---------- | ---- |',
        ...entries.map((e) => `| \`${e.type}\` | \`${e.userId ?? 'anonymous'}\` |`),
      ].join('\n'),
    });
  }
}
