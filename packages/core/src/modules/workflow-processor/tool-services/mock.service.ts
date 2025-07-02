import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  Service,
  ServiceInterface,
  ServiceCallResult, DocumentType, WorkflowEntity, ContextInterface, TransitionMetadataInterface,
} from '@loopstack/shared';
import { TemplateExpressionEvaluatorService } from '../services';

const config = z
  .object({
    input: z.any().optional(),
    output: z.any().optional(),
    error: z.string().optional(),
  })
  .strict();

const schema = z
  .object({
    input: z.any().optional(),
    output: z.any().optional(),
    error: z.string().optional(),
  })
  .strict();

@Injectable()
@Service({
  config,
  schema,
})
export class MockService implements ServiceInterface {
  private readonly logger = new Logger(MockService.name);

  constructor(private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService) {}

  async apply(
    props: z.infer<typeof schema>,
    workflow: WorkflowEntity,
    context: ContextInterface,
    transitionData: TransitionMetadataInterface,
    parentArguments: any,
  ): Promise<ServiceCallResult> {
    if (props.input) {

      const input = this.templateExpressionEvaluatorService.parse<DocumentType>(
        props.input,
        {
          arguments: parentArguments,
          context,
          workflow,
          transition: transitionData
        },
      );

      this.logger.debug(`Received mock input:`);
      this.logger.debug(props.input);
      this.logger.debug(parentArguments);
      this.logger.debug(input);
    }

    const output = props.output ? this.templateExpressionEvaluatorService.parse<DocumentType>(
      props.output,
      {
        arguments: parentArguments,
        context,
        workflow,
        transition: transitionData
      },
    ) : null;

    if (props.error) {

      const error = this.templateExpressionEvaluatorService.parse<string>(
        props.error,
        {
          arguments: parentArguments,
          context,
          workflow,
          transition: transitionData
        },
      );

      throw new Error(error);
    }

    return {
      success: true,
      data: output,
    };
  }
}
