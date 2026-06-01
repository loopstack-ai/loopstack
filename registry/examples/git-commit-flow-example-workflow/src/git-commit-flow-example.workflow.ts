import { Inject } from '@nestjs/common';
import { BaseWorkflow, DOCUMENT_STORE, Final, Initial, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { DocumentStore, WorkflowContext } from '@loopstack/common';
import { GitAddTool, GitCommitTool, GitLogTool, GitStatusTool } from '@loopstack/git-module';

const COMMIT_MESSAGE = 'chore: example commit from git-commit-flow workflow';

interface GitCommitFlowState {}

@Workflow({
  title: 'Git Commit Flow Example',
})
export class GitCommitFlowExampleWorkflow extends BaseWorkflow<Record<string, unknown>, GitCommitFlowState> {
  constructor(
    private readonly gitStatus: GitStatusTool,
    private readonly gitAdd: GitAddTool,
    private readonly gitCommit: GitCommitTool,
    private readonly gitLog: GitLogTool,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
  ) {
    super();
  }

  @Initial({ to: 'status_checked' })
  async checkStatus(
    ctx: WorkflowContext,
    args: Record<string, unknown>,
    state: GitCommitFlowState,
  ): Promise<GitCommitFlowState> {
    const status = await this.gitStatus.call();
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Status before commit:\n\`\`\`json\n${JSON.stringify(status.data, null, 2)}\n\`\`\``,
    });
    return state;
  }

  @Transition({ from: 'status_checked', to: 'staged' })
  async stageAll(ctx: WorkflowContext, state: GitCommitFlowState): Promise<GitCommitFlowState> {
    await this.gitAdd.call({ files: ['.'] });
    return state;
  }

  @Transition({ from: 'staged', to: 'committed' })
  async commit(ctx: WorkflowContext, state: GitCommitFlowState): Promise<GitCommitFlowState> {
    await this.gitCommit.call({ message: COMMIT_MESSAGE });
    return state;
  }

  @Final({ from: 'committed' })
  async readBack(ctx: WorkflowContext, state: GitCommitFlowState): Promise<unknown> {
    const log = await this.gitLog.call({ limit: 1 });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Latest commit:\n\`\`\`json\n${JSON.stringify(log.data, null, 2)}\n\`\`\``,
    });
    return {};
  }
}
