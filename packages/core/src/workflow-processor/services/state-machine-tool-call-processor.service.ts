import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  DocumentEntity,
  ToolExecutionContext,
  ToolInterface,
  ToolResult,
  ToolSideEffects,
  getBlockArgsSchema,
  getBlockTemplateHelpers,
  getBlockTool,
} from '@loopstack/common';
import { WorkflowTransitionSchema } from '@loopstack/contracts/schemas';
import { AssignmentConfigType, ToolCallType } from '@loopstack/contracts/types';
import { TemplateExpressionEvaluatorService } from '../../common';
import { ExecutionContextManager, WorkflowExecutionContextManager } from '../utils/execution-context-manager';
import { getTemplateVars } from '../utils/template-helper';
import { wrapToolProxy } from '../utils/wrap-block-proxy';
import { ToolExecutionInterceptorService } from './tool-execution-interceptor.service';

@Injectable()
export class StateMachineToolCallProcessorService {
  private readonly logger = new Logger(StateMachineToolCallProcessorService.name);

  constructor(
    private readonly templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private readonly toolExecutionInterceptorService: ToolExecutionInterceptorService,
  ) {}

  async processToolCalls(
    ctx: WorkflowExecutionContextManager,
    toolCalls: ToolCallType[] | undefined,
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

        const rawTool = getBlockTool<ToolInterface>(ctx.getInstance(), toolCall.tool);
        if (!rawTool) {
          throw new Error(`Tool with name ${toolCall.tool} not found.`);
        }
        const tool = wrapToolProxy(rawTool);

        const evaluatedArgs = this.templateExpressionEvaluatorService.evaluateTemplate<unknown>(
          toolCall.args,
          getTemplateVars(ctx),
          {
            cacheKey: ctx.getInstance().constructor.name,
            helpers: getBlockTemplateHelpers(ctx.getInstance()),
          },
        ) as Record<string, unknown> | undefined;
        let parsedArgs: Record<string, unknown> | undefined;
        if (tool.validate) {
          parsedArgs = tool.validate<Record<string, unknown>>(evaluatedArgs);
        } else {
          const schema = getBlockArgsSchema(tool);
          parsedArgs = schema ? (schema.parse(evaluatedArgs) as Record<string, unknown> | undefined) : evaluatedArgs;
        }

        const execContext: ToolExecutionContext = {
          tool,
          args: parsedArgs,
          runContext: ctx.getContext(),
        };

        await this.toolExecutionInterceptorService.beforeExecute(execContext);

        let toolCallResult: ToolResult;
        const startTime = performance.now();
        try {
          toolCallResult = await tool.execute(parsedArgs, ctx.getContext(), ctx.getInstance(), ctx.getData());
        } catch (error) {
          execContext.metrics = { durationMs: Math.round(performance.now() - startTime) };
          await this.toolExecutionInterceptorService.onError(execContext, error);
          throw error;
        }
        execContext.metrics = { durationMs: Math.round(performance.now() - startTime) };

        await this.toolExecutionInterceptorService.afterExecute(execContext, toolCallResult);

        this.assignToTargetBlock(ctx, toolCall.assign as AssignmentConfigType, toolCallResult);

        if (toolCall.id) {
          toolResults[toolCall.id] = toolCallResult;
        }
        toolResults[i.toString()] = toolCallResult;

        // do this early, so subsequent tool calls can use results
        const transitionResults = ctx.getManager().getData('tools');
        transitionResults[transition.id] = toolResults;
        ctx.getManager().setData('tools', transitionResults);

        if (toolCallResult.effects) {
          effects.push(toolCallResult.effects);
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

    // update the entity index
    document.index = documents.length ?? 0;

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

    documents.push(document);
    ctx.getManager().setData('documents', documents);
    ctx.getManager().setData('persistenceState', {
      documentsUpdated: true,
    });
  }

  assignToTargetBlock(ctx: ExecutionContextManager, assign: AssignmentConfigType | undefined, result: ToolResult) {
    if (assign) {
      const update: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(assign)) {
        update[key] = this.templateExpressionEvaluatorService.evaluateTemplateRaw<string>(
          value,
          { result },
          {
            cacheKey: ctx.getInstance().constructor.name,
            helpers: getBlockTemplateHelpers(ctx.getInstance()),
            schema: z.array(WorkflowTransitionSchema),
          },
        );
      }

      ctx.getManager().update(update);
    }
  }
}
