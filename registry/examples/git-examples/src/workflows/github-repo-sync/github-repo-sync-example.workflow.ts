import { z } from 'zod';
import { BaseWorkflow, MarkdownDocument, Transition, Workflow } from '@loopstack/common';
import type { TransitionInput } from '@loopstack/common';
import { ConnectGitHubWorkflow } from '@loopstack/github-integration';

const ConnectResultSchema = z.union([
  z.object({ repo: z.string(), url: z.string() }),
  z.object({ cancelled: z.literal(true) }),
]);
type ConnectResult = z.infer<typeof ConnectResultSchema>;

@Workflow({
  title: 'Git - GitHub Repo Sync Example',
  description:
    'Launches the ConnectGitHubWorkflow from @loopstack/github-integration as a sub-workflow. End-to-end: OAuth → create or pick repo → handle uncommitted changes → resolve divergence → connect.',
})
export class GithubRepoSyncExampleWorkflow extends BaseWorkflow {
  constructor(private readonly connectGitHubWorkflow: ConnectGitHubWorkflow) {
    super();
  }

  @Transition({ to: 'connecting' })
  async connect(_state: Record<string, unknown>) {
    await this.connectGitHubWorkflow.run(
      {},
      { callback: { transition: 'connectComplete' }, show: 'inline', label: 'Connecting to GitHub...' },
    );
  }

  @Transition({
    from: 'connecting',
    to: 'end',
    wait: true,
    schema: ConnectResultSchema,
  })
  async connectComplete(_state: Record<string, unknown>, input: TransitionInput<ConnectResult>) {
    if ('cancelled' in input.data) {
      await this.documentStore.save(MarkdownDocument, {
        markdown: '### Cancelled\n\nThe sync was cancelled.',
      });
      return;
    }

    await this.documentStore.save(MarkdownDocument, {
      markdown: `### Connected\n\nWorkspace synced with [${input.data.repo}](${input.data.url}).`,
    });
    this.setResult({ repo: input.data.repo, url: input.data.url } as unknown as Record<string, unknown>);
  }
}
