import { TestingModule } from '@nestjs/testing';
import { LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import { GlobTool, ReadTool } from '@loopstack/remote-client';
import { ToolMock, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { RemoteFileExplorerExampleWorkflow } from '../remote-file-explorer-example.workflow';

describe('RemoteFileExplorerExampleWorkflow', () => {
  let module: TestingModule;
  let workflow: RemoteFileExplorerExampleWorkflow;
  let processor: WorkflowProcessorService;
  let mockGlob: ToolMock;
  let mockRead: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(RemoteFileExplorerExampleWorkflow)
      .withImports(LoopCoreModule)
      .withToolMock(GlobTool)
      .withToolMock(ReadTool)
      .compile();

    workflow = module.get(RemoteFileExplorerExampleWorkflow);
    processor = module.get(WorkflowProcessorService);
    mockGlob = module.get(GlobTool);
    mockRead = module.get(ReadTool);
  });

  afterEach(async () => {
    await module.close();
  });

  it('globs files and reads the first match', async () => {
    mockGlob.call.mockResolvedValue({ data: ['README.md', 'docs/INTRO.md'] });
    mockRead.call.mockResolvedValue({ data: { content: '# Hello' } });

    const result = await processor.process(workflow, {}, createStatelessContext());

    expect(result.hasError).toBe(false);
    expect(result.place).toBe('end');

    expect(mockGlob.call).toHaveBeenCalledWith({ pattern: '**/*.md' }, undefined);
    expect(mockRead.call).toHaveBeenCalledWith({ file_path: 'README.md' }, undefined);

    const text = JSON.stringify(result.documents);
    expect(text).toContain('README.md');
    expect(text).toContain('Found 2 markdown files');
  });

  it('handles an empty file list gracefully', async () => {
    mockGlob.call.mockResolvedValue({ data: [] });

    const result = await processor.process(workflow, {}, createStatelessContext());

    expect(result.hasError).toBe(false);
    expect(result.place).toBe('end');
    expect(mockRead.call).not.toHaveBeenCalled();
    expect(JSON.stringify(result.documents)).toContain('No markdown files');
  });
});
