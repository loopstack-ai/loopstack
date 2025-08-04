import { Injectable, Logger } from '@nestjs/common';
import { HandlerRegistry } from '../../configuration';
import {
  ContextInterface,
  HandlerCallResult,
  TransitionMetadataInterface,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';
import { TemplateExpressionEvaluatorService } from './template-expression-evaluator.service';
import { HandlerCallType } from '@loopstack/shared/dist/schemas/handler-call.schema';

@Injectable()
export class HandlerExecutionService {
  private logger = new Logger(HandlerExecutionService.name);

  constructor(
    private handlerRegistry: HandlerRegistry,
    private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
  ) {}

  async callHandler(
    handlerCall: HandlerCallType,
    parentArguments: any,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    transitionData: TransitionMetadataInterface,
    templateVariables: Record<string, any>,
  ): Promise<HandlerCallResult> {
    this.logger.debug(`Handler ${handlerCall.handler} called with arguments`);

    const { instance, options } = this.handlerRegistry.getHandlerByName(
      handlerCall.handler,
    );

    const hasArguments =
      handlerCall.arguments && Object.keys(handlerCall.arguments).length;
    if (!options.schema && hasArguments) {
      throw Error(`Handler called with arguments but no schema defined.`);
    }

    // parse handler execution arguments
    const handlerCallArguments = hasArguments
      ? this.templateExpressionEvaluatorService.parse<any>(
          handlerCall.arguments,
          {
            ...templateVariables,
            arguments: parentArguments,
            context,
            workflow,
            transition: transitionData,
          },
          {
            schema: options.schema,
          },
        )
      : {};

    this.logger.debug(`Calling handler ${handlerCall.handler}`);

    return instance.apply(
      handlerCallArguments,
      workflow,
      context,
      transitionData,
      parentArguments,
    );
  }
}
