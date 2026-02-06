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
import { z } from 'zod';
import {
  BlockExecutionContextDto,
  getBlockArgsSchema,
  getBlockConfig,
  getBlockHelper,
  getBlockHelpers,
  getBlockStateSchema,
  getBlockTools,
} from '@loopstack/common';
import { WorkflowProcessorService } from '@loopstack/core';
import { CreateChatMessage, CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { ToolMock, createWorkflowTest } from '@loopstack/testing';
import { CounterTool, MathSumTool } from '../../tools';
import { CustomToolExampleWorkflow } from '../custom-tool-example.workflow';

describe('CustomToolExampleWorkflow', () => {
  let module: TestingModule;
  let workflow: CustomToolExampleWorkflow;
  let processor: WorkflowProcessorService;

  let mockMathSumTool: ToolMock;
  let mockCounterTool: ToolMock;
  let mockCreateChatMessageTool: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(CustomToolExampleWorkflow)
      .withImports(CreateChatMessageToolModule)
      .withToolMock(MathSumTool)
      .withToolMock(CounterTool)
      .withToolOverride(CreateChatMessage)
      .compile();

    workflow = module.get(CustomToolExampleWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockMathSumTool = module.get(MathSumTool);
    mockCounterTool = module.get(CounterTool);
    mockCreateChatMessageTool = module.get(CreateChatMessage);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(workflow).toBeDefined();
    });

    it('should have argsSchema defined', () => {
      expect(getBlockArgsSchema(workflow)).toBeDefined();
      expect(getBlockArgsSchema(workflow)).toBeInstanceOf(z.ZodType);
    });

    it('should have stateSchema defined', () => {
      expect(getBlockStateSchema(workflow)).toBeDefined();
      expect(getBlockStateSchema(workflow)).toBeInstanceOf(z.ZodType);
    });

    it('should have config defined', () => {
      expect(getBlockConfig(workflow)).toBeDefined();
    });

    it('should have all tools available via workflow.tools', () => {
      expect(getBlockTools(workflow)).toBeDefined();
      expect(Array.isArray(getBlockTools(workflow))).toBe(true);
      expect(getBlockTools(workflow)).toContain('counterTool');
      expect(getBlockTools(workflow)).toContain('createChatMessage');
      expect(getBlockTools(workflow)).toContain('mathTool');
      expect(getBlockTools(workflow)).toHaveLength(3);
    });
  });

  describe('arguments', () => {
    it('should validate arguments with correct schema', () => {
      const validArgs = { a: 10, b: 20 };

      const schema = getBlockArgsSchema(workflow);
      const result = schema?.parse(validArgs);
      expect(result).toEqual(validArgs);
    });

    it('should apply default values when arguments are missing', () => {
      const schema = getBlockArgsSchema(workflow);
      const result = schema?.parse({});
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should apply partial default values', () => {
      const schema = getBlockArgsSchema(workflow);
      const result = schema?.parse({ a: 5 });
      expect(result).toEqual({ a: 5, b: 2 });
    });

    it('should throw error for invalid argument types', () => {
      const schema = getBlockArgsSchema(workflow);
      expect(() => schema?.parse({ a: 'not a number', b: 20 })).toThrow();
    });
  });

  describe('states', () => {
    it('should have stateSchema with expected properties', () => {
      const schema = getBlockStateSchema(workflow) as z.ZodObject<any>;

      expect(schema).toBeDefined();

      const shape = schema.shape;
      expect(shape.total).toBeDefined();
      expect(shape.count1).toBeDefined();
      expect(shape.count2).toBeDefined();
      expect(shape.count3).toBeDefined();
    });

    it('should validate state with all optional fields', () => {
      const schema = getBlockStateSchema(workflow)!;
      const result = schema.parse({});
      expect(result).toEqual({});
    });

    it('should validate state with populated fields', () => {
      const schema = getBlockStateSchema(workflow)!;
      const state = { total: 100, count1: 1, count2: 2, count3: 3 };
      const result = schema.parse(state);
      expect(result).toEqual(state);
    });

    it('should throw error for invalid state field types', () => {
      const schema = getBlockStateSchema(workflow)!;
      expect(() => schema.parse({ total: 'not a number' })).toThrow();
    });
  });

  describe('helpers', () => {
    it('should have helpers defined', () => {
      expect(getBlockHelpers(workflow)).toBeDefined();
      expect(Array.isArray(getBlockHelpers(workflow))).toBe(true);
    });

    it('should have sum helper registered', () => {
      expect(getBlockHelpers(workflow)).toContain('sum');
    });

    it('should get sum helper via getHelper', () => {
      const sumHelper = getBlockHelper(workflow, 'sum');
      expect(sumHelper).toBeDefined();
      expect(typeof sumHelper).toBe('function');
    });

    it('should return undefined for non-existent helper', () => {
      const nonExistent = getBlockHelper(workflow, 'nonExistentHelper');
      expect(nonExistent).toBeUndefined();
    });

    it('should execute sum helper correctly', () => {
      const sumHelper = getBlockHelper(workflow, 'sum')!;
      expect(sumHelper).toBeDefined();
      const result = sumHelper.call(workflow, 5, 3);
      expect(result).toBe(8);
    });
  });

  describe('workflow execution', () => {
    it('should execute calculate transition with custom arguments', async () => {
      const context = new BlockExecutionContextDto({});

      // Configure mocks for this test
      mockMathSumTool.execute.mockResolvedValue({ data: 30 });
      mockCounterTool.execute
        .mockResolvedValueOnce({ data: 1 })
        .mockResolvedValueOnce({ data: 2 })
        .mockResolvedValueOnce({ data: 3 });

      // Execute
      const result = await processor.process(workflow, { a: 10, b: 20 }, context);

      expect(result).toBeDefined();

      // Runtime
      expect(result.runtime.error).toBe(false);
      expect(result.runtime.stop).toBe(false);

      // Final state
      expect(result.state.get('total')).toBe(30);
      expect(result.state.get('count3')).toBe(3);

      // Tool calls
      expect(mockMathSumTool.execute).toHaveBeenCalledWith({ a: 10, b: 20 }, expect.anything(), expect.anything());
      expect(mockCounterTool.execute).toHaveBeenCalledTimes(3);
      expect(mockCreateChatMessageTool.execute).toHaveBeenCalledTimes(3);

      // Transition history
      const history = result.state.getHistory();
      expect(history[0].metadata.transition?.transition).toBe('calculate');
      expect(history[0].metadata.place).toBe('end');
    });
  });
});

describe('CustomToolExampleWorkflow with existing entity', () => {
  let module: TestingModule; // Declare at describe level

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should resume from existing workflow', async () => {
    module = await createWorkflowTest()
      .forWorkflow(CustomToolExampleWorkflow)
      .withImports(CreateChatMessageToolModule)
      .withToolMock(MathSumTool)
      .withToolMock(CounterTool)
      .withToolOverride(CreateChatMessage)
      .withExistingWorkflow({
        place: 'calculate',
        inputData: { a: 5, b: 10 },
      })
      .compile();

    const workflow = module.get(CustomToolExampleWorkflow);
    expect(workflow).toBeDefined();
  });
});
