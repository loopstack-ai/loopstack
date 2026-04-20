import { BaseWorkflow, Final, Initial, InjectTool, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { GitAddTool, GitCommitTool, GitLogTool, GitStatusTool } from '@loopstack/git-module';

const COMMIT_MESSAGE = 'chore: example commit from git-commit-flow workflow';

@Workflow({
  uiConfig: __dirname + '/git-commit-flow-example.ui.yaml',
})
export class GitCommitFlowExampleWorkflow extends BaseWorkflow {
  @InjectTool() gitStatus: GitStatusTool;
  @InjectTool() gitAdd: GitAddTool;
  @InjectTool() gitCommit: GitCommitTool;
  @InjectTool() gitLog: GitLogTool;

  @Initial({ to: 'status_checked' })
  async checkStatus() {
    const status = await this.gitStatus.call();
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Status before commit:\n\`\`\`json\n${JSON.stringify(status.data, null, 2)}\n\`\`\``,
    });
  }

  @Transition({ from: 'status_checked', to: 'staged' })
  async stageAll() {
    await this.gitAdd.call({ files: ['.'] });
  }

  @Transition({ from: 'staged', to: 'committed' })
  async commit() {
    await this.gitCommit.call({ message: COMMIT_MESSAGE });
  }

  @Final({ from: 'committed' })
  async readBack() {
    const log = await this.gitLog.call({ limit: 1 });
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Latest commit:\n\`\`\`json\n${JSON.stringify(log.data, null, 2)}\n\`\`\``,
    });
  }
}
