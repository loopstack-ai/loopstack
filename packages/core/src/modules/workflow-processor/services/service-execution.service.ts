import { Injectable, Logger } from '@nestjs/common';
import { ServiceRegistry } from '../../configuration';
import {
  ContextInterface,
  ServiceCallResult,
  TransitionMetadataInterface,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';
import { TemplateExpressionEvaluatorService } from './template-expression-evaluator.service';
import { ServiceCallType } from '@loopstack/shared/dist/schemas/service-call.schema';

@Injectable()
export class ServiceExecutionService {
  private logger = new Logger(ServiceExecutionService.name);

  constructor(
    private serviceRegistry: ServiceRegistry,
    private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
  ) {}

  async callService(
    serviceCall: ServiceCallType,
    parentArguments: any,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    transitionData: TransitionMetadataInterface,
  ): Promise<ServiceCallResult> {
    this.logger.debug(`Service ${serviceCall.service} called with arguments`, serviceCall.arguments);
    this.logger.debug(`Parent Arguments:`, parentArguments);

    const { instance, options } = this.serviceRegistry.getServiceByName(serviceCall.service);

    const hasArguments = serviceCall.arguments && Object.keys(serviceCall.arguments).length;
    if (!options.schema && hasArguments) {
      throw Error(`Service called with arguments but no schema defined.`);
    }

    // parse service execution arguments
    const serviceCallArguments = hasArguments ? this.templateExpressionEvaluatorService.parse<any>(
      serviceCall.arguments,
      {
        arguments: parentArguments,
        context,
        workflow,
        transition: transitionData
      },
      {
        schema: options.schema,
      }
    ) : {};

    this.logger.debug(`Calling service ${serviceCall.service}`);

    return instance.apply(serviceCallArguments, workflow, context, transitionData, parentArguments);
  }
}
