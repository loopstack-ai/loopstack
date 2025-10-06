import { Injectable, Logger } from '@nestjs/common';
import { BlockRegistryService } from '../../configuration';
import {
  AssignmentConfigType,
  ContextInterface,
  HandlerCallResult,
  ToolCallType,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';
import { TemplateExpressionEvaluatorService } from './template-expression-evaluator.service';
import { z } from 'zod';
import { ConfigTraceError } from '../../configuration';
import { StateMachine, Tool } from '../abstract';
import { ServiceStateFactory } from './service-state-factory.service';
import { BlockHelperService } from './block-helper.service';

@Injectable()
export class ToolExecutionService {
  private logger = new Logger(ToolExecutionService.name);

  constructor(
    private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private readonly blockRegistryService: BlockRegistryService,
    private readonly serviceStateFactory: ServiceStateFactory,
    private readonly blockHelperService: BlockHelperService,
  ) {}

  async applyTool(
    toolCall: ToolCallType,
    stateMachineBlock: StateMachine,
    workflow: WorkflowEntity | undefined,
  ): Promise<StateMachine> {
    this.logger.debug(
      `Tool ${toolCall.tool} called with arguments`,
      toolCall.arguments,
    );
    this.logger.debug(`Parent Arguments:`, stateMachineBlock.inputs);

    const toolName = this.templateExpressionEvaluatorService.parse<string>(
      toolCall.tool,
      {
        this: stateMachineBlock,
      },
      {
        schema: z.string(),
      },
    );
    const blockRegistryItem = this.blockRegistryService.getBlock(toolName);
    if (!blockRegistryItem) {
      throw new Error(`Block with name ${toolName} not found.`)
    }
    const block = await this.serviceStateFactory.createBlockInstance<Tool>(blockRegistryItem,{
      ...stateMachineBlock.context,
    });
    block.initTool(
      toolCall.arguments,
      stateMachineBlock.currentTransition!,
    )

    try {
      const zodSchema: z.ZodType | undefined = block.metadata.inputSchema;

      const hasArguments =
        toolCall.arguments && Object.keys(toolCall.arguments).length;

      if (!zodSchema && hasArguments) {
        throw Error(`Tool called with arguments but no schema defined.`);
      }

      const toolCallArguments = hasArguments
        ? this.templateExpressionEvaluatorService.parse<ToolCallType>(
          toolCall.arguments,
          {
            parent: stateMachineBlock,
            this: block
          },
          {
            schema: zodSchema,
          },
        )
        : {};

      let result: HandlerCallResult = await block.apply(
        toolCallArguments,
        workflow!,
      );
      if (!result) {
        throw new Error(`Tool execution provided no results.`);
      }

      block.result = result;

      this.blockHelperService.assignToTargetBlock(toolCall.assign as AssignmentConfigType, block, stateMachineBlock);

      return stateMachineBlock;
    } catch (e) {
      throw new ConfigTraceError(e, block);
    }
  }
}
