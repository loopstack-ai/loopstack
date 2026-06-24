import { BaseWorkflow, MarkdownDocument, Transition, Workflow } from '@loopstack/common';
import { FileSystemService } from '@loopstack/local-file-explorer-module';

interface LocalFileExplorerState {
  fileCount?: number;
}

@Workflow({
  title: 'Filesystem - Local File Explorer Example',
  description:
    'Demonstrates @loopstack/local-file-explorer-module — uses FileSystemService to build a file tree of the workspace root and render it as markdown. The module also exposes a REST API for the Studio file panel.',
})
export class LocalFileExplorerExampleWorkflow extends BaseWorkflow {
  constructor(private readonly fileSystem: FileSystemService) {
    super();
  }

  @Transition({ to: 'end' })
  async listTree(_state: LocalFileExplorerState) {
    const tree = await this.fileSystem.buildFileTree(process.cwd());
    const lines = tree.slice(0, 50).map((node) => `- ${node.path} (${node.type})`);

    await this.documentStore.save(MarkdownDocument, {
      markdown: [
        `# Workspace File Tree`,
        '',
        `Found ${tree.length} top-level entries in \`${process.cwd()}\`.`,
        '',
        ...lines,
        tree.length > 50 ? `\n_(${tree.length - 50} more entries omitted)_` : '',
      ].join('\n'),
    });
  }
}
