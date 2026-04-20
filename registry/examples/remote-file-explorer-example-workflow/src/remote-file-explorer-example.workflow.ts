import { BaseWorkflow, Final, Initial, InjectTool, MessageDocument, Workflow } from '@loopstack/common';
import { GlobTool, ReadTool } from '@loopstack/remote-client';

@Workflow({
  uiConfig: __dirname + '/remote-file-explorer-example.ui.yaml',
})
export class RemoteFileExplorerExampleWorkflow extends BaseWorkflow {
  @InjectTool() glob: GlobTool;
  @InjectTool() read: ReadTool;

  firstMatch?: string;

  @Initial({ to: 'listed' })
  async listFiles() {
    const result = await this.glob.call({ pattern: '**/*.md' });
    const files = (result.data as string[]) ?? [];
    this.firstMatch = files[0];

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Found ${files.length} markdown files:\n${files
        .slice(0, 20)
        .map((f) => `- ${f}`)
        .join('\n')}`,
    });
  }

  @Final({ from: 'listed' })
  async readFirst() {
    if (!this.firstMatch) {
      await this.repository.save(MessageDocument, {
        role: 'assistant',
        content: 'No markdown files to read.',
      });
      return;
    }

    const result = await this.read.call({ file_path: this.firstMatch });
    const content = (result.data as { content?: string })?.content ?? '';

    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `# ${this.firstMatch}\n\n${content.slice(0, 500)}`,
    });
  }
}
