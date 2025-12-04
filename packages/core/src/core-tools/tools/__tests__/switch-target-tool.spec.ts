import {
  createToolTestingModule,
  describeSchemaTests,
} from '../../../test';
import { SwitchTarget } from '../switch-target-tool';
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
    SwitchTarget
  ],
  exports: [CoreToolsModuleCapabilityFactory],
})
class CoreToolsModule {}

describe('Tool: SwitchTarget', () => {
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
      tool = await blockFactory.createBlock<SwitchTarget, any>('SwitchTarget', {
        target: 'placeA',
      }, {
        workflow: {
          transition: {
            to: ['placeA', 'placeB'],
          },
        },
      });
    });

    it('tool should be defined', async () => {
      expect(tool).toBeInstanceOf(SwitchTarget);
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
      tool = await blockFactory.createBlock<SwitchTarget, any>('SwitchTarget', {
        target: 'placeA',
      }, {
        workflow: {
          transition: {
            to: ['placeA', 'placeB'],
          },
        },
      });
    });

    describeSchemaTests(() => tool.metadata.properties!, [
      {
        description: 'should not allow additional properties',
        args: { target: 'placeA', extra: 'invalid' },
        shouldPass: false,
      },
      {
        description: 'should accept valid target string',
        args: { target: 'placeA' },
        shouldPass: true,
      },
      {
        description: 'should require target property',
        args: {},
        shouldPass: false,
      },
      {
        description: 'should reject non-string target',
        args: { target: 123 },
        shouldPass: false,
      },
    ]);
  });

  describe('Config Schema', () => {
    let tool: Tool;

    beforeAll(async () => {
      tool = await blockFactory.createBlock<SwitchTarget, any>('SwitchTarget', {
        target: 'placeA',
      }, {
        workflow: {
          transition: {
            to: ['placeA', 'placeB'],
          },
        },
      });
    });

    describeSchemaTests(() => tool.metadata.configSchema!, [
      {
        description: 'should not allow additional properties',
        args: { target: 'placeA', extra: 'invalid' },
        shouldPass: false,
      },
      {
        description: 'should accept valid target string',
        args: { target: 'placeA' },
        shouldPass: true,
      },
      {
        description: 'should accept property accessor expressions',
        args: { target: '${ somePlace }' },
        shouldPass: true,
      },
      {
        description: 'should accept template expressions',
        args: { target: '{{ targetPlace }}' },
        shouldPass: true,
      },
    ]);
  });

  describe('Arguments', () => {
    let tool: Tool;

    beforeAll(async () => {
      tool = await blockFactory.createBlock<SwitchTarget, any>('SwitchTarget', {
        target: 'placeA',
      }, {
        workflow: {
          transition: {
            to: ['placeA', 'placeB'],
          },
        },
      });
    });

    it('should have correct arguments', async () => {
      expect(tool.args).toEqual({ target: 'placeA' });
    });
  });

  describe('Result', () => {
    it('should return setTransitionPlace effect when target is in array of allowed places', async () => {
      const tool = await blockFactory.createBlock<SwitchTarget, any>('SwitchTarget', {
        target: 'placeA',
      }, {
        workflow: {
          transition: {
            to: ['placeA', 'placeB'],
          },
        },
      });

      const result = await tool.execute();

      expect(result.effects).toEqual({ setTransitionPlace: 'placeA' });
    });

    it('should return setTransitionPlace effect when target matches single allowed place', async () => {
      const tool = await blockFactory.createBlock<SwitchTarget, any>('SwitchTarget', {
        target: 'placeA',
      }, {
        workflow: {
          transition: {
            to: 'placeA',
          },
        },
      });

      const result = await tool.execute();

      expect(result.effects).toEqual({ setTransitionPlace: 'placeA' });
    });

    it('should trim whitespace from target', async () => {
      const tool = await blockFactory.createBlock<SwitchTarget, any>('SwitchTarget', {
        target: '  placeA  ',
      }, {
        workflow: {
          transition: {
            to: ['placeA', 'placeB'],
          },
        },
      });

      const result = await tool.execute();

      expect(result.effects).toEqual({ setTransitionPlace: 'placeA' });
    });

    it('should throw error when target is not in array of allowed places', async () => {
      const tool = await blockFactory.createBlock<SwitchTarget, any>('SwitchTarget', {
        target: 'placeC',
      }, {
        workflow: {
          transition: {
            to: ['placeA', 'placeB'],
          },
        },
      });

      await expect(tool.execute()).rejects.toThrow('Transition to place "placeC" not allowed.');
    });

    it('should throw error when target does not match single allowed place', async () => {
      const tool = await blockFactory.createBlock<SwitchTarget, any>('SwitchTarget', {
        target: 'placeB',
      }, {
        workflow: {
          transition: {
            to: 'placeA',
          },
        },
      });

      await expect(tool.execute()).rejects.toThrow('Transition to place "placeB" not allowed.');
    });
  });
});