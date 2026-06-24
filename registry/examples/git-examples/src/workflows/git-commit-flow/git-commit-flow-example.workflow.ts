import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { GitAddTool, GitCommitTool, GitLogTool, GitStatusTool } from '@loopstack/git-module';

const COMMIT_MESSAGE = 'chore: example commit from git-commit-flow workflow';

@Workflow({
  title: 'Git - Commit Flow Example',
  description:
    'Scripted multi-tool git workflow: status → add → commit → log. Demonstrates composing tools without an LLM or agent loop.',
})
export class GitCommitFlowExampleWorkflow extends BaseWorkflow {
  constructor(
    private readonly gitStatus: GitStatusTool,
    private readonly gitAdd: GitAddTool,
    private readonly gitCommit: GitCommitTool,
    private readonly gitLog: GitLogTool,
  ) {
    super();
  }

  @Transition({ to: 'status_checked' })
  async checkStatus(_state: Record<string, unknown>) {
    const status = await this.gitStatus.call();
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Status before commit:\n\`\`\`json\n${JSON.stringify(status.data, null, 2)}\n\`\`\``,
    });
  }

  @Transition({ from: 'status_checked', to: 'staged' })
  async stageAll(_state: Record<string, unknown>) {
    await this.gitAdd.call({ files: ['.'] });
  }

  @Transition({ from: 'staged', to: 'committed' })
  async commit(_state: Record<string, unknown>) {
    await this.gitCommit.call({ message: COMMIT_MESSAGE });
  }

  @Transition({ from: 'committed', to: 'end' })
  async readBack(_state: Record<string, unknown>) {
    const log = await this.gitLog.call({ limit: 1 });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Latest commit:\n\`\`\`json\n${JSON.stringify(log.data, null, 2)}\n\`\`\``,
    });
  }
}
