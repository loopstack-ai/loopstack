import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { GlobTool, GrepTool, ReadTool } from '@loopstack/remote-client';

const SEARCH_PATTERN = 'TODO';

interface FileSearchState {
  firstHit?: string;
}

@Workflow({
  title: 'Remote Client - File Search Example',
  description:
    'Searches a remote workspace with @loopstack/remote-client tools: GlobTool finds Markdown files by name, GrepTool finds the lines that contain "TODO", and ReadTool reads the first file with a match.',
})
export class FileSearchExampleWorkflow extends BaseWorkflow {
  constructor(
    private readonly glob: GlobTool,
    private readonly grep: GrepTool,
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
  }

  @Transition({ from: 'listed', to: 'searched' })
  async searchContents() {
    const result = await this.grep.call({ pattern: SEARCH_PATTERN, glob: '*.md' });
    const matches = (result.data as { matches?: { file: string; line: number; content: string }[] })?.matches ?? [];

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Found ${matches.length} lines with "${SEARCH_PATTERN}":\n${matches
        .slice(0, 20)
        .map((m) => `- ${m.file}:${m.line} ${m.content.trim()}`)
        .join('\n')}`,
    });
    this.assignState({ firstHit: matches[0]?.file });
  }

  @Transition({ from: 'searched', to: 'end' })
  async readFirstHit(state: FileSearchState) {
    if (!state.firstHit) {
      await this.documentStore.save(MessageDocument, {
        role: 'assistant',
        text: `No file contains "${SEARCH_PATTERN}".`,
      });
      return;
    }

    const result = await this.read.call({ file_path: state.firstHit });
    const content = (result.data as { content?: string })?.content ?? '';

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `# ${state.firstHit}\n\n${content.slice(0, 500)}`,
    });
  }
}
