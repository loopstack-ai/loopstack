import { Block, ExecutionContext, HandlerCallResult } from '@loopstack/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { Tool } from '../../abstract';
import { BlockRegistryService, ConfigTraceError } from '../../../configuration';

const CreateTemplateInputSchema = z.object({
  document: z.string(),
});

const CreateTemplateConfigSchema = z.object({
  document: z.string(),
});

type CreateTemplateInput = z.infer<typeof CreateTemplateInputSchema>;

@Block({
  config: {
    description: 'Create a template from a document schema.',
  },
  properties: CreateTemplateInputSchema,
  configSchema: CreateTemplateConfigSchema,
})
export class CreateTemplate extends Tool {
  protected readonly logger = new Logger(CreateTemplate.name);

  constructor(private readonly blockRegistryService: BlockRegistryService) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async execute(
    ctx: ExecutionContext<CreateTemplateInput>,
  ): Promise<HandlerCallResult> {
    // if (!ctx.workflow) {
    //   throw new Error('Workflow is undefined');
    // }
    //
    // this.logger.debug(`Creating template for document ${ctx.args.document}`);
    //
    // const documentBlock = this.blockRegistryService.getBlock(ctx.args.document);
    // if (!documentBlock) {
    //   throw new Error(`Document ${ctx.args.document} not found.`);
    // }
    //
    // try {
    //   const builder = new SchemaToTemplateBuilder();
    //   const outputTemplate = builder.createTemplateFromSchema(
    //     documentBlock.metadata.inputSchema,
    //   );
    //
    //   this.logger.debug(`Create template: "${documentBlock.target.name}".`);

      return {
        success: true,
        data: {} //outputTemplate,
      };
    // } catch (e) {
    //   throw new ConfigTraceError(e as Error, this);
    // }
  }
}
