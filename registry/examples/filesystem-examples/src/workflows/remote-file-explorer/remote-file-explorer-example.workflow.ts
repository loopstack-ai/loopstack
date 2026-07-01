import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { GlobTool, ReadTool } from '@loopstack/remote-client';

interface RemoteFileExplorerState {
  firstMatch?: string;
}

@Workflow({
  title: 'Filesystem - Remote File Explorer Example',
  description:
    'Browses a remote workspace via @loopstack/remote-client GlobTool + ReadTool — finds Markdown files, reads the first match.',
})
export class RemoteFileExplorerExampleWorkflow extends BaseWorkflow {
  constructor(
    private readonly glob: GlobTool,
    private readonly read: ReadTool,
  ) {
    super();
  }

  @Transition({ to: 'listed' })
  async listFiles() {
    const result = await this.glob.call({ pattern: '**/*.md' });
    const files = (result.data as { files?: string[] })?.files ?? [];

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Found ${files.length} markdown files:\n${files
        .slice(0, 20)
        .map((f) => `- ${f}`)
        .join('\n')}`,
    });
    this.assignState({ firstMatch: files[0] });
  }

  @Transition({ from: 'listed', to: 'end' })
  async readFirst(state: RemoteFileExplorerState) {
    if (!state.firstMatch) {
      await this.documentStore.save(MessageDocument, {
        role: 'assistant',
        text: 'No markdown files to read.',
      });
      return;
    }

    const result = await this.read.call({ file_path: state.firstMatch });
    const content = (result.data as { content?: string })?.content ?? '';

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `# ${state.firstMatch}\n\n${content.slice(0, 500)}`,
    });
  }
}
