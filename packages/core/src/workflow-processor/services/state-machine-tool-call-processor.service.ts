import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  DocumentEntity,
  RunContext,
  ToolExecutionContext,
  ToolInterface,
  ToolResult,
  ToolSideEffects,
  WorkflowInterface,
  WorkflowMetadataInterface,
  getBlockArgsSchema,
  getBlockTemplateHelpers,
  getBlockTool,
} from '@loopstack/common';
import { WorkflowTransitionSchema } from '@loopstack/contracts/schemas';
import { AssignmentConfigType, HistoryTransition, ToolCallType } from '@loopstack/contracts/types';
import { TemplateExpressionEvaluatorService } from '../../common';
import { WorkflowExecutionContextManager } from '../utils';
import { getTemplateVars } from '../utils';
import { wrapToolProxy } from '../utils';
import { ToolExecutionInterceptorService } from './tool-execution-interceptor.service';

@Injectable()
export class StateMachineToolCallProcessorService {
  private readonly logger = new Logger(StateMachineToolCallProcessorService.name);

  constructor(
    private readonly templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private readonly toolExecutionInterceptorService: ToolExecutionInterceptorService,
  ) {}

  getTool(instance: WorkflowInterface, toolName: string): ToolInterface {
    const rawTool = getBlockTool<ToolInterface>(instance, toolName);
    if (!rawTool) {
      throw new Error(`Tool with name ${toolName} not found.`);
    }
    return wrapToolProxy(rawTool);
  }

  getArgs(
    ctx: WorkflowExecutionContextManager,
    tool: ToolInterface,
    rawArgs: Record<string, unknown> | undefined,
    transition: HistoryTransition,
    debug?: boolean,
  ): Record<string, unknown> | undefined {
    if (rawArgs) {
      const evaluatedArgs = this.templateExpressionEvaluatorService.evaluateTemplate<unknown>(
        rawArgs,
        getTemplateVars(ctx),
        {
          cacheKey: ctx.getInstance().constructor.name,
          helpers: getBlockTemplateHelpers(ctx.getInstance()),
        },
      ) as Record<string, unknown> | undefined;

      if (debug) {
        this.logger.log(`[DEBUG] Transition "${transition.id}" | Tool "${tool.constructor.name}" raw args:`);
        console.log(JSON.stringify(evaluatedArgs, null, 2));
      }

      return evaluatedArgs;
    }

    return undefined;
  }

  parseArgs(
    tool: ToolInterface,
    args: Record<string, unknown> | undefined,
    transition: HistoryTransition,
    debug?: boolean,
  ) {
    let parsedArgs: Record<string, unknown> | undefined;
    try {
      if (tool.validate) {
        parsedArgs = tool.validate<Record<string, unknown>>(args);
      } else {
        const schema = getBlockArgsSchema(tool);
        parsedArgs = schema ? (schema.parse(args) as Record<string, unknown> | undefined) : args;
      }
    } catch (e: unknown) {
      this.logger.error(`Schema error in transition ${transition.id} tool call: ${tool.constructor.name} with args.`);
      console.log(args);
      throw e;
    }

    if (debug) {
      this.logger.log(`[DEBUG] Transition "${transition.id}" | Tool "${tool.constructor.name}" parsed args:`);
      console.log(JSON.stringify(parsedArgs, null, 2));
    }

    return parsedArgs;
  }

  async executeToolCall(
    tool: ToolInterface,
    args: Record<string, unknown> | undefined,
    runContext: RunContext,
    instance: WorkflowInterface,
    metadata: WorkflowMetadataInterface,
  ): Promise<ToolResult> {
    const execContext: ToolExecutionContext = {
      tool,
      args,
      runContext,
    };

    await this.toolExecutionInterceptorService.beforeExecute(execContext);

    let toolCallResult: ToolResult;
    const startTime = performance.now();
    try {
      toolCallResult = await tool.execute(args, runContext, instance, metadata);
    } catch (error) {
      execContext.metrics = { durationMs: Math.round(performance.now() - startTime) };
      await this.toolExecutionInterceptorService.onError(execContext, error);
      throw error;
    }
    execContext.metrics = { durationMs: Math.round(performance.now() - startTime) };

    await this.toolExecutionInterceptorService.afterExecute(execContext, toolCallResult);

    return toolCallResult;
  }

  async processToolCalls(
    ctx: WorkflowExecutionContextManager,
    toolCalls: ToolCallType[] | undefined,
    debug = false,
  ): Promise<WorkflowExecutionContextManager> {
    const transition = ctx.getManager().getData('transition')!;

    const effects: ToolSideEffects[] = [];
    const toolResults: Record<string, any> = {};

    if (!toolCalls) {
      return ctx;
    }

    if (toolCalls) {
      let i = 0;

      for (const toolCall of toolCalls) {
        this.logger.debug(`Call tool ${i} (${toolCall.tool}) on transition ${transition.id}`);

        const tool = this.getTool(ctx.getInstance(), toolCall.tool);
        const args = this.getArgs(ctx, tool, toolCall.args as Record<string, unknown> | undefined, transition, debug);
        const parsedArgs = this.parseArgs(tool, args, transition, debug);

        const toolCallResult = await this.executeToolCall(
          tool,
          parsedArgs,
          ctx.getContext(),
          ctx.getInstance(),
          ctx.getData(),
        );
        if (debug) {
          this.logger.log(`[DEBUG] Transition "${transition.id}" | Tool "${toolCall.tool}" result:`);
          console.log(JSON.stringify(toolCallResult, null, 2));
        }

        this.assignToTargetBlock(ctx, toolCall.assign as AssignmentConfigType, toolCallResult, debug);

        if (toolCall.id) {
          toolResults[toolCall.id] = toolCallResult;
        }
        toolResults[i.toString()] = toolCallResult;

        // do this early, so subsequent tool calls can use results
        const transitionResults = ctx.getManager().getData('tools');
        transitionResults[transition.id] = toolResults;
        ctx.getManager().setData('tools', transitionResults);

        if (toolCallResult.effects) {
          effects.push(...toolCallResult.effects);
        }

        i++;
      }

      // add documents early for timely updates in frontend
      // persisted with next loop iteration
      for (const effect of effects) {
        if (effect.addWorkflowDocuments?.length) {
          this.addDocuments(ctx, effect.addWorkflowDocuments);
        }
      }
    }

    return ctx;
  }

  addDocuments(ctx: WorkflowExecutionContextManager, documents: DocumentEntity[]) {
    for (const document of documents) {
      const existingIndex = document.id
        ? ctx
            .getManager()
            .getData('documents')
            .findIndex((d) => d.id === document.id)
        : -1;

      if (existingIndex != -1) {
        this.updateDocument(ctx, existingIndex, document);
      } else {
        this.addDocument(ctx, document);
      }
    }
  }

  updateDocument(ctx: WorkflowExecutionContextManager, index: number, document: DocumentEntity) {
    const documents = ctx.getManager().getData('documents');

    // preserve the position index of the document being replaced
    document.index = index;

    if (index != -1) {
      documents[index] = document;
    }

    ctx.getManager().setData('documents', documents);
    ctx.getManager().setData('persistenceState', {
      documentsUpdated: true,
    });
  }

  addDocument(ctx: WorkflowExecutionContextManager, document: DocumentEntity) {
    // invalidate previous versions of the same document
    const documents = ctx.getManager().getData('documents');
    for (const doc of documents) {
      if (doc.messageId === document.messageId && doc.meta?.invalidate !== false) {
        doc.isInvalidated = true;
      }
    }

    document.index = documents.length;
    documents.push(document);
    ctx.getManager().setData('documents', documents);
    ctx.getManager().setData('persistenceState', {
      documentsUpdated: true,
    });
  }

  assignToTargetBlock(
    ctx: WorkflowExecutionContextManager,
    assign: AssignmentConfigType | undefined,
    result: ToolResult,
    debug = false,
  ) {
    if (assign) {
      const update: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(assign)) {
        update[key] = this.templateExpressionEvaluatorService.evaluateTemplateRaw<string>(
          value,
          { ...getTemplateVars(ctx), result },
          {
            cacheKey: ctx.getInstance().constructor.name,
            helpers: getBlockTemplateHelpers(ctx.getInstance()),
            schema: z.array(WorkflowTransitionSchema),
          },
        );
      }

      if (debug) {
        for (const [key, val] of Object.entries(update)) {
          this.logger.log(`[DEBUG] Assign state "${key}":`);
          console.log(JSON.stringify(val, null, 2));
        }
      }

      ctx.getManager().update(update);
    }
  }
}
