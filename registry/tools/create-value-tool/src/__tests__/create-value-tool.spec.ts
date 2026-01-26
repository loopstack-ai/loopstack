/*
Copyright 2025 The Loopstack Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { TestingModule } from '@nestjs/testing';
import { CreateValue } from '../create-value-tool';
import { createToolTest } from '@loopstack/testing';

describe('CreateValue', () => {
  let module: TestingModule;
  let tool: CreateValue;

  beforeEach(async () => {
    module = await createToolTest()
      .forTool(CreateValue)
      .compile();

    tool = module.get(CreateValue);
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
    it('should validate input with any value', () => {
      const validated = tool.validate({ input: 'test' });
      expect(validated).toEqual({ input: 'test' });
    });

    it('should validate input with number', () => {
      const validated = tool.validate({ input: 42 });
      expect(validated).toEqual({ input: 42 });
    });

    it('should validate input with object', () => {
      const validated = tool.validate({ input: { key: 'value' } });
      expect(validated).toEqual({ input: { key: 'value' } });
    });

    it('should validate input with array', () => {
      const validated = tool.validate({ input: [1, 2, 3] });
      expect(validated).toEqual({ input: [1, 2, 3] });
    });

    it('should validate input with null', () => {
      const validated = tool.validate({ input: null });
      expect(validated).toEqual({ input: null });
    });

    it('should reject extra properties (strict mode)', () => {
      expect(() => tool.validate({ input: 'test', extra: 'field' })).toThrow();
    });

    it('should reject missing input property', () => {
      expect(() => tool.validate({})).toThrow();
    });
  });

  describe('execution', () => {
    it('should return string input as data', async () => {
      const args = tool.validate({ input: 'hello world' });
      const result = await tool.execute(args);

      expect(result.data).toBe('hello world');
    });

    it('should return number input as data', async () => {
      const args = tool.validate({ input: 123 });
      const result = await tool.execute(args);

      expect(result.data).toBe(123);
    });

    it('should return object input as data', async () => {
      const input = { name: 'test', value: 42 };
      const args = tool.validate({ input });
      const result = await tool.execute(args);

      expect(result.data).toEqual(input);
    });

    it('should return array input as data', async () => {
      const input = [1, 'two', { three: 3 }];
      const args = tool.validate({ input });
      const result = await tool.execute(args);

      expect(result.data).toEqual(input);
    });

    it('should return boolean input as data', async () => {
      const args = tool.validate({ input: true });
      const result = await tool.execute(args);

      expect(result.data).toBe(true);
    });

    it('should return null input as data', async () => {
      const args = tool.validate({ input: null });
      const result = await tool.execute(args);

      expect(result.data).toBeNull();
    });

    it('should return nested object input as data', async () => {
      const input = {
        level1: {
          level2: {
            level3: 'deep value',
          },
        },
      };
      const args = tool.validate({ input });
      const result = await tool.execute(args);

      expect(result.data).toEqual(input);
    });
  });
});