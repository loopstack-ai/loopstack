import {
  createToolTestingModule,
  describeSchemaTests,
} from '../../../test';
import { CreateValue } from '../create-value-tool';
import {
  BlockFactory,
  Tool,
} from '../../../workflow-processor';
import { TestingModule } from '@nestjs/testing';
import { Module } from '@nestjs/common';
import { CoreToolsModuleCapabilityFactory } from '../../core-tools-module-capability.factory';

@Module({
  providers: [
    CoreToolsModuleCapabilityFactory,
    CreateValue
  ],
  exports: [CoreToolsModuleCapabilityFactory],
})
class CoreToolsModule {}

describe('Tool: CreateValue', () => {
  let module: TestingModule;
  let blockFactory: BlockFactory;

  beforeAll(async () => {
    module = await createToolTestingModule(CoreToolsModule);
    await module.init();
    blockFactory = module.get(BlockFactory);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Block Metadata', () => {
    let tool: Tool;

    beforeAll(async () => {
      tool = await blockFactory.createBlock<CreateValue, any>('CreateValue', {
        input: 'any',
      }, {});
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
      tool = await blockFactory.createBlock<CreateValue, any>('CreateValue', {
        input: 'any',
      }, {});
    });

    describeSchemaTests(() => tool.metadata.properties!, [
      {
        description: 'should not allow additional properties',
        args: { input: 'Hello World!', test: 1 },
        shouldPass: false,
      },
      {
        description: 'should accept valid input',
        args: { input: 'Hello World!' },
        shouldPass: true
      }
    ]);
  });

  describe('Config Schema', () => {
    let tool: Tool;

    beforeAll(async () => {
      tool = await blockFactory.createBlock<CreateValue, any>('CreateValue', {
        input: 'any',
      }, {});
    });

    describeSchemaTests(() => tool.metadata.configSchema!, [
      {
        description: 'should not allow additional properties',
        args: { input: 'Hello World!', test: 1 },
        shouldPass: false,
      },
      {
        description: 'should accept valid input',
        args: { input: 'Hello World!' },
        shouldPass: true
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
      tool = await blockFactory.createBlock<CreateValue, any>('CreateValue', {
        input: 'any',
      }, {});
    });

    it('should have correct arguments', async () => {
      expect(tool.args).toEqual({ input: 'any' });
    });
  });

  describe('Result', () => {
    it('should return correct ', async () => {
      const tool = await blockFactory.createBlock<CreateValue, any>('CreateValue', {
        input: 'hello world',
      }, {});

      const result = await tool.execute();

      expect(result.data).toBe('hello world');
    });
  });
});