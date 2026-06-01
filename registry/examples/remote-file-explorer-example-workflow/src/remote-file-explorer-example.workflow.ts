import { Inject } from '@nestjs/common';
import { BaseWorkflow, DOCUMENT_STORE, Final, Initial, MessageDocument, Workflow } from '@loopstack/common';
import type { DocumentStore, WorkflowContext } from '@loopstack/common';
import { GlobTool, ReadTool } from '@loopstack/remote-client';

interface RemoteFileExplorerState {
  firstMatch?: string;
}

@Workflow({
  title: 'Remote File Explorer',
  uiConfig: __dirname + '/remote-file-explorer-example.ui.yaml',
})
export class RemoteFileExplorerExampleWorkflow extends BaseWorkflow<Record<string, unknown>, RemoteFileExplorerState> {
  constructor(
    private readonly glob: GlobTool,
    private readonly read: ReadTool,
    @Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore,
  ) {
    super();
  }

  @Initial({ to: 'listed' })
  async listFiles(
    ctx: WorkflowContext,
    args: Record<string, unknown>,
    state: RemoteFileExplorerState,
  ): Promise<RemoteFileExplorerState> {
    const result = await this.glob.call({ pattern: '**/*.md' });
    const files = (result.data as { files?: string[] })?.files ?? [];

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Found ${files.length} markdown files:\n${files
        .slice(0, 20)
        .map((f) => `- ${f}`)
        .join('\n')}`,
    });
    return { ...state, firstMatch: files[0] };
  }

  @Final({ from: 'listed' })
  async readFirst(ctx: WorkflowContext, state: RemoteFileExplorerState): Promise<unknown> {
    if (!state.firstMatch) {
      await this.documentStore.save(MessageDocument, {
        role: 'assistant',
        content: 'No markdown files to read.',
      });
      return {};
    }

    const result = await this.read.call({ file_path: state.firstMatch });
    const content = (result.data as { content?: string })?.content ?? '';

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `# ${state.firstMatch}\n\n${content.slice(0, 500)}`,
    });
    return {};
  }
}
