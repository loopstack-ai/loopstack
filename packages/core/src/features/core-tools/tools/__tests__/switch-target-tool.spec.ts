import { TestingModule } from '@nestjs/testing';
import { SwitchTarget } from '../switch-target-tool';
import { createExecutionContext, createToolTest } from '../../../../test';

describe('SwitchTarget', () => {
  let module: TestingModule;
  let tool: SwitchTarget;

  beforeEach(async () => {
    module = await createToolTest()
      .forTool(SwitchTarget)
      .compile();

    tool = module.get(SwitchTarget);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(tool).toBeDefined();
    });

    it('should have argsSchema defined', () => {
      expect(tool.argsSchema).toBeDefined();
    });
  });

  describe('validation', () => {
    it('should validate valid target string', () => {
      const validated = tool.validate({ target: 'next-place' });
      expect(validated).toEqual({ target: 'next-place' });
    });

    it('should validate empty target string', () => {
      const validated = tool.validate({ target: '' });
      expect(validated).toEqual({ target: '' });
    });

    it('should reject non-string target', () => {
      expect(() => tool.validate({ target: 123 })).toThrow();
    });

    it('should reject missing target property', () => {
      expect(() => tool.validate({})).toThrow();
    });

    it('should reject extra properties (strict mode)', () => {
      expect(() => tool.validate({ target: 'place', extra: 'field' })).toThrow();
    });

    it('should reject null target', () => {
      expect(() => tool.validate({ target: null })).toThrow();
    });
  });

  describe('execution with array of targets', () => {
    it('should set transition place when target is in allowed array', async () => {
      const ctx = createExecutionContext({
        runtime: {
          transition: {
            to: ['place-a', 'place-b', 'place-c'],
          },
        },
      });

      const args = tool.validate({ target: 'place-b' });
      const result = await tool.execute(args, ctx);

      expect(result.effects).toBeDefined();
      expect(result.effects!.setTransitionPlace).toBe('place-b');
    });

    it('should throw error when target is not in allowed array', async () => {
      const ctx = createExecutionContext({
        runtime: {
          transition: {
            to: ['place-a', 'place-b'],
          },
        },
      });

      const args = tool.validate({ target: 'invalid-place' });

      await expect(tool.execute(args, ctx)).rejects.toThrow(
        'Transition to place "invalid-place" not allowed.'
      );
    });

    it('should trim whitespace from target before checking', async () => {
      const ctx = createExecutionContext({
        runtime: {
          transition: {
            to: ['place-a', 'place-b'],
          },
        },
      });

      const args = tool.validate({ target: '  place-a  ' });
      const result = await tool.execute(args, ctx);

      expect(result.effects!.setTransitionPlace).toBe('place-a');
    });
  });

  describe('execution with single target', () => {
    it('should set transition place when target matches single allowed value', async () => {
      const ctx = createExecutionContext({
        runtime: {
          transition: {
            to: 'only-place',
          },
        },
      });

      const args = tool.validate({ target: 'only-place' });
      const result = await tool.execute(args, ctx);

      expect(result.effects).toBeDefined();
      expect(result.effects!.setTransitionPlace).toBe('only-place');
    });

    it('should throw error when target does not match single allowed value', async () => {
      const ctx = createExecutionContext({
        runtime: {
          transition: {
            to: 'only-place',
          },
        },
      });

      const args = tool.validate({ target: 'wrong-place' });

      await expect(tool.execute(args, ctx)).rejects.toThrow(
        'Transition to place "wrong-place" not allowed.'
      );
    });

    it('should trim whitespace and match single target', async () => {
      const ctx = createExecutionContext({
        runtime: {
          transition: {
            to: 'target-place',
          },
        },
      });

      const args = tool.validate({ target: '  target-place  ' });
      const result = await tool.execute(args, ctx);

      expect(result.effects!.setTransitionPlace).toBe('target-place');
    });
  });

});