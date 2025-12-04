import { CreateValue } from '../create-value-tool';
import { TestingModule } from '@nestjs/testing';
import { createToolTestingContext, describeSchemaTests } from '../../../test';
import { Tool } from '../../../workflow-processor';

describe('Tool: CreateValue', () => {
  let module: TestingModule;
  let createToolInstance: (args: any, ctx?: any) => Promise<CreateValue>;

  beforeAll(async () => {
    const ctx = await createToolTestingContext(CreateValue);
    module = ctx.module;
    createToolInstance = ctx.createTool;
  });

  afterAll(async () => {
    await module?.close();
  });

  describe('Block Metadata', () => {
    let tool: CreateValue;

    beforeAll(async () => {
      tool = await createToolInstance({ input: 'any' });
    });

    it('tool should be defined', async () => {
      expect(tool).toBeInstanceOf(CreateValue);
    });

    it('should have metadata attached', () => {
      expect(tool.metadata).toBeDefined();
    });

    it('should have properties schema', () => {
      expect(tool.metadata.properties).toBeDefined();
    });

    it('should have config schema', () => {
      expect(tool.metadata.configSchema).toBeDefined();
    });
  });

  describe('Properties Schema', () => {
    let tool: Tool;

    beforeAll(async () => {
      tool = await createToolInstance({ input: 'any' });
    });

    describeSchemaTests(() => tool.metadata.properties!, [
      {
        description: 'should not allow additional properties',
        args: { input: 'Hello World!', test: 1 },
        shouldPass: false,
      },
      {
        description: 'should accept valid string input',
        args: { input: 'Hello World!' },
        shouldPass: true,
      },
    ]);
  });

  describe('Config Schema', () => {
    let tool: Tool;

    beforeAll(async () => {
      tool = await createToolInstance({ input: 'any' });
    });

    describeSchemaTests(() => tool.metadata.configSchema!, [
      {
        description: 'should not allow additional properties',
        args: { input: 'Hello World!', test: 1 },
        shouldPass: false,
      },
      {
        description: 'should accept valid string input',
        args: { input: 'Hello World!' },
        shouldPass: true,
      },
      {
        description: 'should accept property accessor expressions',
        args: { input: '${ someValue }' },
        shouldPass: true,
      },
      {
        description: 'should accept template expressions',
        args: { input: '{{ valueA }}' },
        shouldPass: true,
      },
    ]);
  });

  describe('Arguments', () => {
    let tool: Tool;

    beforeAll(async () => {
      tool = await createToolInstance({ input: 'any' });
    });

    it('should have correct arguments', async () => {
      expect(tool.args).toEqual({ input: 'any' });
    });
  });

  describe('Result', () => {
    it('should return string input unchanged', async () => {
      const tool = await createToolInstance({ input: 'hello world' });
      const result = await tool.execute();

      expect(result.data).toBe('hello world');
    });
  });
});