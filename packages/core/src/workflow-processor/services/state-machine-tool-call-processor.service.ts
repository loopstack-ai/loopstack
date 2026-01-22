import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { DocumentEntity, ToolResult, ToolSideEffects } from '@loopstack/common';
import { WorkflowTransitionSchema } from '@loopstack/contracts/schemas';
import { AssignmentConfigType, ToolCallType } from '@loopstack/contracts/types';
import { CustomHelper, TemplateExpressionEvaluatorService } from '../../common';
import { WorkflowBase } from '../abstract';
import { WorkflowExecution } from '../interfaces';

@Injectable()
export class StateMachineToolCallProcessorService {
  private readonly logger = new Logger(StateMachineToolCallProcessorService.name);

  constructor(private readonly templateExpressionEvaluatorService: TemplateExpressionEvaluatorService) {}

  async processToolCalls(
    block: WorkflowBase,
    toolCalls: ToolCallType[] | undefined,
    args: any,
    ctx: WorkflowExecution,
  ): Promise<WorkflowExecution> {
    const transition = ctx.runtime.transition!;

    const effects: ToolSideEffects[] = [];
    const toolResults: Record<string, any> = {};

    if (!toolCalls) {
      return ctx;
    }

    try {
      if (toolCalls) {
        let i = 0;

        for (const toolCall of toolCalls) {
          this.logger.debug(`Call tool ${i} (${toolCall.tool}) on transition ${transition.id}`);

          const tool = block.getTool(toolCall.tool);
          if (!tool) {
            throw new Error(`Tool with name ${toolCall.tool} not found.`);
          }

          const templateHelpers: CustomHelper[] = block.helpers
            .map((name: string) => ({
              name,
              fn: block.getHelper(name),
            }))
            .filter((helper): helper is CustomHelper => helper.fn !== undefined);

          const evaluatedArgs = this.templateExpressionEvaluatorService.evaluateTemplate<unknown>(
            toolCall.args,
            block.getTemplateVars(args, ctx),
            {
              cacheKey: block.name,
              helpers: templateHelpers,
            },
          );

          const parsedArgs: unknown = tool.validate(evaluatedArgs);

          const toolCallResult: ToolResult = await tool.execute(parsedArgs, ctx, block);

          this.assignToTargetBlock(block, toolCall.assign as AssignmentConfigType, ctx, toolCallResult);

          if (toolCall.id) {
            toolResults[toolCall.id] = toolCallResult;
          }
          toolResults[i.toString()] = toolCallResult;

          // do this early, so subsequent tool calls can use results
          ctx.state.updateMetadata({
            tools: {
              [transition.id]: toolResults,
            },
          });

          if (toolCallResult.effects) {
            effects.push(toolCallResult.effects);
          }

          i++;
        }

        // apply the transition to next place
        const transitionEffects = effects.reduce(
          (acc, effect) => {
            acc.setTransitionPlace = effect.setTransitionPlace;
            return acc;
          },
          { setTransitionPlace: undefined },
        );

        if (transitionEffects.setTransitionPlace) {
          ctx.runtime.nextPlace = transitionEffects.setTransitionPlace;
        }

        // add documents early for timely updates in frontend
        // persisted with next loop iteration
        for (const effect of effects) {
          if (effect.addWorkflowDocuments?.length) {
            this.addDocuments(ctx, effect.addWorkflowDocuments);
          }
        }
      }
    } catch (e) {
      // re-throw error if errors are not handled gracefully
      if (!transition.onError) {
        throw e;
      }

      // set error place through manipulating effects
      effects.push({
        setTransitionPlace: transition.onError,
      });

      // todo: add error info
      // this.addWorkflowTransitionData(
      //   workflowEntity,
      //   currentTransition.id!,
      //   'error',
      //   e.message,
      // );
    }

    return ctx;
  }

  addDocuments(ctx: WorkflowExecution, documents: DocumentEntity[]) {
    for (const document of documents) {
      const existingIndex = document.id
        ? ctx.state.getMetadata('documents').findIndex((d) => d.id === document.id)
        : -1;

      if (existingIndex != -1) {
        this.updateDocument(ctx, existingIndex, document);
      } else {
        this.addDocument(ctx, document);
      }
    }
  }

  updateDocument(ctx: WorkflowExecution, index: number, document: DocumentEntity) {
    const documents = ctx.state.getMetadata('documents');

    if (index != -1) {
      documents[index] = document;
    }

    ctx.state.setMetadata('documents', documents);
    ctx.runtime.persistenceState.documentsUpdated = true;
  }

  addDocument(ctx: WorkflowExecution, document: DocumentEntity) {
    // invalidate previous versions of the same document
    const documents = ctx.state.getMetadata('documents');
    for (const doc of documents) {
      if (doc.messageId === document.messageId && doc.meta?.invalidate !== false) {
        doc.isInvalidated = true;
      }
    }

    documents.push(document);
    ctx.state.setMetadata('documents', documents);
    ctx.runtime.persistenceState.documentsUpdated = true;
  }

  assignToTargetBlock(
    block: WorkflowBase,
    assign: AssignmentConfigType | undefined,
    ctx: WorkflowExecution,
    result: ToolResult,
  ) {
    if (assign) {
      const templateHelpers: CustomHelper[] = block.helpers
        .map((name: string) => ({
          name,
          fn: block.getHelper(name),
        }))
        .filter((helper): helper is CustomHelper => helper.fn !== undefined);

      const update: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(assign)) {
        update[key] = this.templateExpressionEvaluatorService.evaluateTemplateRaw<string>(
          value,
          { result },
          {
            cacheKey: block.name,
            helpers: templateHelpers,
            schema: z.array(WorkflowTransitionSchema),
          },
        );
      }

      ctx.state.update(update);
    }
  }
}
