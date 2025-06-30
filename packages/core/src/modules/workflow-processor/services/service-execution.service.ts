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

    // get the service argument schema
    const serviceCallArgumentsSchemaPath = `services.arguments.${serviceCall.service}`;

    // parse service execution arguments
    const serviceCallArguments = serviceCall.arguments ? this.templateExpressionEvaluatorService.parse(
      serviceCall.arguments,
      parentArguments,
      context,
      workflow,
      transitionData,
      serviceCallArgumentsSchemaPath,
    ) : {};

    this.logger.debug(`Calling service ${serviceCall.service}`);

    // execute the service method
    const { instance } = this.serviceRegistry.getServiceByName(serviceCall.service);
    return instance.apply(serviceCallArguments, workflow, context, transitionData, parentArguments);
  }
}
