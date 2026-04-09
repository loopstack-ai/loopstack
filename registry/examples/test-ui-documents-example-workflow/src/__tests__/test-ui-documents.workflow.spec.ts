import { TestingModule } from '@nestjs/testing';
import { LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import { createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { TestUiDocumentsWorkflow } from '../test-ui-documents.workflow';

describe('TestUiDocumentsWorkflow', () => {
  let module: TestingModule;
  let workflow: TestUiDocumentsWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    module = await createWorkflowTest().forWorkflow(TestUiDocumentsWorkflow).withImports(LoopCoreModule).compile();

    workflow = module.get(TestUiDocumentsWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(workflow).toBeDefined();
  });

  describe('render_all transition', () => {
    it('should create all four document types', async () => {
      const context = createStatelessContext();

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);
      expect(result.documents.filter((d) => !d.isInvalidated)).toHaveLength(4);
    });

    it('should create a message document', async () => {
      const context = createStatelessContext();

      const result = await processor.process(workflow, {}, context);

      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            className: 'MessageDocument',
            content: {
              role: 'assistant',
              content: 'This is the default message',
            },
          }),
        ]),
      );
    });

    it('should create an error document', async () => {
      const context = createStatelessContext();

      const result = await processor.process(workflow, {}, context);

      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            className: 'ErrorDocument',
            content: {
              error: 'This is an error message',
            },
          }),
        ]),
      );
    });

    it('should create a markdown document', async () => {
      const context = createStatelessContext();

      const result = await processor.process(workflow, {}, context);

      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            className: 'MarkdownDocument',
            content: {
              markdown: expect.stringContaining('# Markdown'),
            },
          }),
        ]),
      );
    });

    it('should create a plain text document', async () => {
      const context = createStatelessContext();

      const result = await processor.process(workflow, {}, context);

      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            className: 'PlainDocument',
            content: {
              text: 'This is plain text',
            },
          }),
        ]),
      );
    });
  });
});
