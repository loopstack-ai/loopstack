import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import { BashTool, ReadTool, WriteTool } from '@loopstack/remote-client';

interface RemoteClientState {
  filePath?: string;
}

@Workflow({
  title: 'Filesystem - Remote Client Example',
  description:
    'Demonstrates @loopstack/remote-client tools beyond file browsing: write a file, run a shell command on the remote machine via BashTool, read the result. Useful when you need command execution against a remote workspace.',
})
export class RemoteClientExampleWorkflow extends BaseWorkflow {
  constructor(
    private readonly bash: BashTool,
    private readonly read: ReadTool,
    private readonly write: WriteTool,
  ) {
    super();
  }

  @Transition({ to: 'file_written' })
  async writeFile(_state: RemoteClientState) {
    const filePath = '/tmp/remote-client-example.txt';
    await this.write.call({
      file_path: filePath,
      content: 'Hello from RemoteClientExampleWorkflow!\n',
    });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Wrote file ${filePath}.`,
    });
    this.assignState({ filePath });
  }

  @Transition({ from: 'file_written', to: 'command_executed' })
  async runCommand(state: RemoteClientState) {
    const result = await this.bash.call({
      command: `wc -l ${state.filePath} && date`,
    });
    const stdout = (result.data as { stdout?: string })?.stdout ?? '';
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Command output:\n\`\`\`\n${stdout}\n\`\`\``,
    });
  }

  @Transition({ from: 'command_executed', to: 'end' })
  async readBack(state: RemoteClientState) {
    const result = await this.read.call({ file_path: state.filePath! });
    const content = (result.data as { content?: string })?.content ?? '';
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Final file content:\n\`\`\`\n${content}\n\`\`\``,
    });
  }
}
