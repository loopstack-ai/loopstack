import { TestingModule } from '@nestjs/testing';
import { RunContext } from '@loopstack/common';
import { CreateDocument, LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import { ToolMock, createWorkflowTest } from '@loopstack/testing';
import { TestUiDocumentsWorkflow } from '../test-ui-documents.workflow';

describe('TestUiDocumentsWorkflow', () => {
  let module: TestingModule;
  let workflow: TestUiDocumentsWorkflow;
  let processor: WorkflowProcessorService;

  let mockCreateDocument: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(TestUiDocumentsWorkflow)
      .withImports(LoopCoreModule)
      .withToolOverride(CreateDocument)
      .compile();

    workflow = module.get(TestUiDocumentsWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockCreateDocument = module.get(CreateDocument);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(workflow).toBeDefined();
  });

  describe('render_all transition', () => {
    it('should create all four document types', async () => {
      const context = {} as RunContext;
      mockCreateDocument.execute.mockResolvedValue({ data: undefined });

      await processor.process(workflow, {}, context);

      expect(mockCreateDocument.execute).toHaveBeenCalledTimes(4);
    });

    it('should create a message document', async () => {
      const context = {} as RunContext;
      mockCreateDocument.execute.mockResolvedValue({ data: undefined });

      await processor.process(workflow, {}, context);

      expect(mockCreateDocument.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.anything(),
          update: {
            content: {
              role: 'assistant',
              content: 'This is the default message',
            },
          },
        }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should create an error document', async () => {
      const context = {} as RunContext;
      mockCreateDocument.execute.mockResolvedValue({ data: undefined });

      await processor.process(workflow, {}, context);

      expect(mockCreateDocument.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.anything(),
          update: {
            content: {
              error: 'This is an error message',
            },
          },
        }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should create a markdown document', async () => {
      const context = {} as RunContext;
      mockCreateDocument.execute.mockResolvedValue({ data: undefined });

      await processor.process(workflow, {}, context);

      expect(mockCreateDocument.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.anything(),
          update: {
            content: {
              markdown: expect.stringContaining('# Markdown'),
            },
          },
        }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should create a plain text document', async () => {
      const context = {} as RunContext;
      mockCreateDocument.execute.mockResolvedValue({ data: undefined });

      await processor.process(workflow, {}, context);

      expect(mockCreateDocument.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.anything(),
          update: {
            content: {
              text: 'This is plain text',
            },
          },
        }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });
  });
});
