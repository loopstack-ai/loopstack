import { TestingModule } from '@nestjs/testing';
import { WorkflowProcessorService } from '@loopstack/core';
import { createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { DynamicRoutingExampleWorkflow } from '../dynamic-routing-example.workflow';

describe('DynamicRoutingExampleWorkflow', () => {
  let module: TestingModule;
  let workflow: DynamicRoutingExampleWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    module = await createWorkflowTest().forWorkflow(DynamicRoutingExampleWorkflow).compile();

    workflow = module.get(DynamicRoutingExampleWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(workflow).toBeDefined();
    });
  });

  describe('routing', () => {
    const context = createStatelessContext();

    it('should route to placeB when value <= 100', async () => {
      const result = await processor.process(workflow, { value: 50 }, context);

      expect(result.hasError).toBe(false);

      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            className: 'MessageDocument',
            content: expect.objectContaining({ role: 'assistant', content: 'Analysing value = 50' }),
          }),
          expect.objectContaining({
            className: 'MessageDocument',
            content: expect.objectContaining({ role: 'assistant', content: 'Value is less or equal 100' }),
          }),
        ]),
      );
    });

    it('should route to placeC when value > 200', async () => {
      const result = await processor.process(workflow, { value: 250 }, context);

      expect(result.hasError).toBe(false);

      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            className: 'MessageDocument',
            content: expect.objectContaining({ role: 'assistant', content: 'Analysing value = 250' }),
          }),
          expect.objectContaining({
            className: 'MessageDocument',
            content: expect.objectContaining({ role: 'assistant', content: 'Value is greater than 200' }),
          }),
        ]),
      );
    });

    it('should route to placeD when 100 < value <= 200', async () => {
      const result = await processor.process(workflow, { value: 150 }, context);

      expect(result.hasError).toBe(false);

      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            className: 'MessageDocument',
            content: expect.objectContaining({ role: 'assistant', content: 'Analysing value = 150' }),
          }),
          expect.objectContaining({
            className: 'MessageDocument',
            content: expect.objectContaining({
              role: 'assistant',
              content: 'Value is less or equal 200, but greater than 100',
            }),
          }),
        ]),
      );
    });
  });
});
