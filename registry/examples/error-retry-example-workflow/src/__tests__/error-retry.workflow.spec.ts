import { TestingModule } from '@nestjs/testing';
import { RunContext, WorkflowEntity } from '@loopstack/common';
import { WorkflowProcessorService } from '@loopstack/core';
import { ToolMock, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { ErrorRetryWorkflow } from '../error-retry.workflow';
import { SlowTool } from '../tools/slow.tool';
import { Step1Tool } from '../tools/step1.tool';
import { Step2Tool } from '../tools/step2.tool';

describe('ErrorRetryWorkflow', () => {
  let module: TestingModule;
  let workflow: ErrorRetryWorkflow;
  let processor: WorkflowProcessorService;

  let _mockStep1Tool: ToolMock;
  let mockStep2Tool: ToolMock;
  let mockSlowTool: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(ErrorRetryWorkflow)
      .withToolMock(Step1Tool)
      .withToolMock(Step2Tool)
      .withToolMock(SlowTool)
      .compile();

    workflow = module.get(ErrorRetryWorkflow);
    processor = module.get(WorkflowProcessorService);

    _mockStep1Tool = module.get(Step1Tool);
    mockStep2Tool = module.get(Step2Tool);
    mockSlowTool = module.get(SlowTool);
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
  });

  describe('Step 1: Auto-retry', () => {
    it('should auto-retry on failure and signal re-queue', async () => {
      const context = createStatelessContext();

      // First call fails
      mockStep2Tool.call.mockRejectedValueOnce(new Error('Simulated error'));

      const result = await processor.process(workflow, {}, context);

      // Should have error and a retry signal (auto-retry pending)
      expect(result.hasError).toBe(true);
      expect(result._retrySignal).toBeDefined();
      expect(result._retrySignal!.delayMs).toBe(1000); // first retry: 1s
      expect(result.place).toBe('step1_done'); // stays at from place
      expect(result.retryCount).toBe(1);

      // ErrorDocument should be saved inline
      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            className: 'ErrorDocument',
            content: expect.objectContaining({ error: 'Simulated error' }),
          }),
        ]),
      );
    });

    it('should succeed after auto-retries exhaust and manual retry', async () => {
      const context = createStatelessContext();

      // Fail first 2 times, succeed on 3rd
      mockStep2Tool.call
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce({ data: 'ok' })
        // Step 2 (manual retry step) — succeed immediately
        .mockResolvedValue({ data: 'ok' });

      // Run 1: initial — fails, auto-retry signal
      const result1 = await processor.process(workflow, {}, context);
      expect(result1.hasError).toBe(true);
      expect(result1._retrySignal).toBeDefined();
      expect(result1.place).toBe('step1_done');
      expect(result1.retryCount).toBe(1);

      // Run 2: simulate auto-retry (re-run with hasError from entity)
      const result2 = await processor.process(workflow, {}, {
        workflowEntity: {
          id: '00000000-0000-0000-0000-000000000001',
          place: 'step1_done',
          hasError: true,
          retryCount: 1,
          retryTransitionId: 'autoRetryStep',
          documents: result1.documents,
        } as Partial<WorkflowEntity>,
      } as RunContext);

      expect(result2.hasError).toBe(true);
      expect(result2._retrySignal).toBeDefined();
      expect(result2._retrySignal!.delayMs).toBe(2000); // second retry: 2s
      expect(result2.retryCount).toBe(2);

      // Run 3: simulate auto-retry #2 — succeeds, progresses through steps
      const result3 = await processor.process(workflow, {}, {
        workflowEntity: {
          id: '00000000-0000-0000-0000-000000000001',
          place: 'step1_done',
          hasError: true,
          retryCount: 2,
          retryTransitionId: 'autoRetryStep',
          documents: result2.documents,
        } as Partial<WorkflowEntity>,
      } as RunContext);

      // Should succeed and progress past step1 into step2 instructions, then stop at step2_ready (manual)
      expect(result3.hasError).toBe(false);
      expect(result3._retrySignal).toBeUndefined();
    });
  });

  describe('Step 2: Manual retry', () => {
    it('should fail and stay at place for manual retry', async () => {
      const context = createStatelessContext();

      // Setup + step1 succeed, step2 instructions succeed, manual step fails
      mockStep2Tool.call
        .mockResolvedValueOnce({ data: 'ok' }) // autoRetryStep
        .mockRejectedValueOnce(new Error('Manual fail')); // manualRetryStep

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(true);
      expect(result.place).toBe('step2_ready'); // stays at from place
      expect(result._retrySignal).toBeUndefined(); // no auto-retry, manual mode
    });

    it('should succeed on manual retry', async () => {
      // Simulate resuming from failed manual step
      mockStep2Tool.call.mockResolvedValueOnce({ data: 'ok' }); // manualRetryStep succeeds

      const result = await processor.process(workflow, {}, {
        workflowEntity: {
          id: '00000000-0000-0000-0000-000000000001',
          place: 'step2_ready',
          hasError: true,
          retryCount: 0,
          retryTransitionId: 'manualRetryStep',
          documents: [],
        } as Partial<WorkflowEntity>,
      } as RunContext);

      // manualRetryStep succeeds → progresses to step3
      expect(result.hasError).toBe(false);
    });
  });

  describe('Step 3: Custom error place', () => {
    it('should transition to custom error place on failure', async () => {
      // Start from step3_ready — set hasError: true so processor doesn't skip
      mockStep2Tool.call.mockRejectedValueOnce(new Error('Custom error'));

      const result = await processor.process(workflow, {}, {
        workflowEntity: {
          id: '00000000-0000-0000-0000-000000000001',
          place: 'step3_ready',
          hasError: true,
          retryCount: 0,
          retryTransitionId: null,
          documents: [],
        } as Partial<WorkflowEntity>,
      } as RunContext);

      expect(result.hasError).toBe(true);
      expect(result.place).toBe('error_custom');
      expect(result._retrySignal).toBeUndefined();

      // Should have wait transition available for recovery
      expect(result.availableTransitions).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'handleCustomError', trigger: 'manual' })]),
      );
    });

    it('should recover via wait transition', async () => {
      const workflowId = '00000000-0000-0000-0000-000000000001';

      const result = await processor.process(workflow, {}, {
        workflowEntity: {
          id: workflowId,
          place: 'error_custom',
          hasError: true,
          retryCount: 0,
          retryTransitionId: null,
          documents: [],
        } as Partial<WorkflowEntity>,
        payload: {
          transition: {
            id: 'handleCustomError',
            workflowId,
            payload: {},
          },
        },
      } as RunContext);

      // Should recover and continue past error_custom
      expect(result.hasError).toBe(false);
    });
  });

  describe('Step 4: Timeout', () => {
    it('should fail when transition exceeds timeout', async () => {
      // SlowTool takes too long — simulate by having the mock delay
      mockSlowTool.call.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: 'late' }), 5000)),
      );

      const result = await processor.process(workflow, {}, {
        workflowEntity: {
          id: '00000000-0000-0000-0000-000000000001',
          place: 'step4_ready',
          hasError: true,
          retryCount: 0,
          retryTransitionId: null,
          documents: [],
        } as Partial<WorkflowEntity>,
      } as RunContext);

      expect(result.hasError).toBe(true);
      expect(result.place).toBe('step4_ready'); // stays at from place (manual retry)
      expect(result.errorMessage).toContain('timed out');
    }, 10000);

    it('should succeed on retry when operation is fast', async () => {
      mockSlowTool.call.mockResolvedValueOnce({ data: 'fast' });

      const result = await processor.process(workflow, {}, {
        workflowEntity: {
          id: '00000000-0000-0000-0000-000000000001',
          place: 'step4_ready',
          hasError: true,
          retryCount: 0,
          retryTransitionId: 'timeoutStep',
          documents: [],
        } as Partial<WorkflowEntity>,
      } as RunContext);

      expect(result.hasError).toBe(false);
    });
  });

  describe('Step 5: Hybrid (auto-retry + custom place)', () => {
    it('should auto-retry once then transition to custom error place', async () => {
      // First call: fails → auto-retry
      mockStep2Tool.call.mockRejectedValueOnce(new Error('Hybrid fail 1'));

      const result1 = await processor.process(workflow, {}, {
        workflowEntity: {
          id: '00000000-0000-0000-0000-000000000001',
          place: 'step5_ready',
          hasError: true,
          retryCount: 0,
          retryTransitionId: null,
          documents: [],
        } as Partial<WorkflowEntity>,
      } as RunContext);

      expect(result1.hasError).toBe(true);
      expect(result1._retrySignal).toBeDefined(); // auto-retry 1/1
      expect(result1.retryCount).toBe(1);
      expect(result1.place).toBe('step5_ready'); // still at from place

      // Second call: fails again → retries exhausted → custom place
      mockStep2Tool.call.mockRejectedValueOnce(new Error('Hybrid fail 2'));

      const result2 = await processor.process(workflow, {}, {
        workflowEntity: {
          id: '00000000-0000-0000-0000-000000000001',
          place: 'step5_ready',
          hasError: true,
          retryCount: 1,
          retryTransitionId: 'hybridStep',
          documents: result1.documents,
        } as Partial<WorkflowEntity>,
      } as RunContext);

      expect(result2.hasError).toBe(true);
      expect(result2._retrySignal).toBeUndefined(); // no more auto-retries
      expect(result2.place).toBe('error_hybrid'); // transitions to custom error place

      // Should have wait transition for recovery
      expect(result2.availableTransitions).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'handleHybridError', trigger: 'manual' })]),
      );
    });

    it('should recover via wait transition from hybrid error', async () => {
      const workflowId = '00000000-0000-0000-0000-000000000001';

      const result = await processor.process(workflow, {}, {
        workflowEntity: {
          id: workflowId,
          place: 'error_hybrid',
          hasError: true,
          retryCount: 0,
          retryTransitionId: null,
          documents: [],
        } as Partial<WorkflowEntity>,
        payload: {
          transition: {
            id: 'handleHybridError',
            workflowId,
            payload: {},
          },
        },
      } as RunContext);

      // Should recover and reach 'done' → 'end'
      expect(result.hasError).toBe(false);
      expect(result.place).toBe('end');
    });
  });

  describe('full workflow execution', () => {
    it('should complete setup and progress to step1_done', async () => {
      const context = createStatelessContext();

      // autoRetryStep succeeds immediately
      mockStep2Tool.call.mockResolvedValue({ data: 'ok' });

      const result = await processor.process(workflow, {}, context);

      // Should run through all steps without error (all tools succeed)
      expect(result.hasError).toBe(false);
    });
  });
});
