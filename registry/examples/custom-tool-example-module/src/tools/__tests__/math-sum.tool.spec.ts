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
import { MathSumTool } from '../math-sum.tool';
import { MathService } from '../../services/math.service';
import { createToolTest } from '@loopstack/testing';

describe('MathSumTool', () => {
  let module: TestingModule;
  let tool: MathSumTool;

  describe('with real MathService', () => {
    beforeEach(async () => {
      module = await createToolTest()
        .forTool(MathSumTool)
        .withProvider(MathService)
        .compile();

      tool = module.get(MathSumTool);
    });

    afterEach(async () => {
      await module.close();
    });

    it('should be defined', () => {
      expect(tool).toBeDefined();
    });

    it('should have argsSchema defined', () => {
      expect(tool.argsSchema).toBeDefined();
    });

    it('should calculate sum of two positive numbers', async () => {
      const args = tool.validate({ a: 2, b: 3 });
      const result = await tool.execute(args);
      expect(result.data).toBe(5);
    });

    it('should handle negative numbers', async () => {
      const args = tool.validate({ a: -5, b: 3 });
      const result = await tool.execute(args);
      expect(result.data).toBe(-2);
    });

    it('should handle zero', async () => {
      const args = tool.validate({ a: 0, b: 0 });
      const result = await tool.execute(args);
      expect(result.data).toBe(0);
    });
  });

  describe('with mocked MathService', () => {
    const mockMathService = {
      sum: jest.fn(),
    };

    beforeEach(async () => {
      jest.clearAllMocks();

      module = await createToolTest()
        .forTool(MathSumTool)
        .withMock(MathService, mockMathService)
        .compile();

      tool = module.get(MathSumTool);
    });

    afterEach(async () => {
      await module.close();
    });

    it('should call mathService.sum with correct arguments', async () => {
      mockMathService.sum.mockReturnValue(42);

      const args = tool.validate({ a: 10, b: 32 });
      const result = await tool.execute(args);

      expect(mockMathService.sum).toHaveBeenCalledWith(10, 32);
      expect(result.data).toBe(42);
    });

    it('should handle service returning negative values', async () => {
      mockMathService.sum.mockReturnValue(-100);

      const args = tool.validate({ a: 1, b: 1 });
      const result = await tool.execute(args);

      expect(result.data).toBe(-100);
    });
  });

  describe('validation', () => {
    beforeEach(async () => {
      module = await createToolTest()
        .forTool(MathSumTool)
        .withProvider(MathService)
        .compile();

      tool = module.get(MathSumTool);
    });

    afterEach(async () => {
      await module.close();
    });

    it('should validate correct input', () => {
      const validated = tool.validate({ a: 1, b: 2 });
      expect(validated).toEqual({ a: 1, b: 2 });
    });

    it('should reject non-numeric values', () => {
      expect(() => tool.validate({ a: 'one', b: 2 })).toThrow();
    });

    it('should reject extra properties (strict mode)', () => {
      expect(() => tool.validate({ a: 1, b: 2, c: 3 })).toThrow();
    });

    it('should reject missing required properties', () => {
      expect(() => tool.validate({ a: 1 })).toThrow();
    });
  });
});
