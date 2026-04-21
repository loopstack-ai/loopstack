import { TestingModule } from '@nestjs/testing';
import { LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import { GitAddTool, GitCommitTool, GitLogTool, GitStatusTool } from '@loopstack/git-module';
import { ToolMock, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { GitCommitFlowExampleWorkflow } from '../git-commit-flow-example.workflow';

describe('GitCommitFlowExampleWorkflow', () => {
  let module: TestingModule;
  let workflow: GitCommitFlowExampleWorkflow;
  let processor: WorkflowProcessorService;

  let mockGitStatus: ToolMock;
  let mockGitAdd: ToolMock;
  let mockGitCommit: ToolMock;
  let mockGitLog: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(GitCommitFlowExampleWorkflow)
      .withImports(LoopCoreModule)
      .withToolMock(GitStatusTool)
      .withToolMock(GitAddTool)
      .withToolMock(GitCommitTool)
      .withToolMock(GitLogTool)
      .compile();

    workflow = module.get(GitCommitFlowExampleWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockGitStatus = module.get(GitStatusTool);
    mockGitAdd = module.get(GitAddTool);
    mockGitCommit = module.get(GitCommitTool);
    mockGitLog = module.get(GitLogTool);
  });

  afterEach(async () => {
    await module.close();
  });

  it('is defined', () => {
    expect(workflow).toBeDefined();
  });

  it('runs status → add → commit → log and ends', async () => {
    mockGitStatus.call.mockResolvedValue({
      data: { branch: 'main', staged: [], modified: ['README.md'], untracked: [], deleted: [] },
    });
    mockGitAdd.call.mockResolvedValue({ data: { staged: ['.'] } });
    mockGitCommit.call.mockResolvedValue({ data: { hash: 'deadbeef' } });
    mockGitLog.call.mockResolvedValue({ data: [{ hash: 'deadbeef', message: 'chore: example commit' }] });

    const result = await processor.process(workflow, {}, createStatelessContext());

    expect(result.hasError).toBe(false);
    expect(result.place).toBe('end');

    expect(mockGitStatus.call).toHaveBeenCalledTimes(1);
    expect(mockGitAdd.call).toHaveBeenCalledWith({ files: ['.'] }, undefined);
    expect(mockGitCommit.call).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) }),
      undefined,
    );
    expect(mockGitLog.call).toHaveBeenCalledWith({ limit: 1 }, undefined);

    expect(JSON.stringify(result.documents)).toContain('deadbeef');
  });
});
