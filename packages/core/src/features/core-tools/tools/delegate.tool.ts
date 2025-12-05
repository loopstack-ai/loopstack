import { BlockConfig, HandlerCallResult } from '@loopstack/common';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { TemplateExpression } from '@loopstack/contracts/schemas';
import { DelegateService } from '../services';
import { ProcessorFactory, Tool } from '../../../workflow-processor';

const DelegateToolSchema = z
  .object({
    tool: z.string(),
    args: z.any().optional(),
    allowedTools: z.array(z.string()),
  })
  .strict();

const DelegateToolConfigSchema = z
  .object({
    tool: z.union([z.string(), TemplateExpression]),
    args: z.any().optional(),
    allowedTools: z.array(z.string()),
  })
  .strict();

type DelegateToolType = z.infer<typeof DelegateToolSchema>;

@BlockConfig({
  config: {
    description: 'Delegate to another tool.',
  },
  properties: DelegateToolSchema,
  configSchema: DelegateToolConfigSchema,
})
export class DelegateTool extends Tool<DelegateToolType> {
  protected readonly logger = new Logger(DelegateTool.name);

  constructor(private readonly delegateService: DelegateService) {
    super();
  }

  async execute(
    args: DelegateToolType,
    ctx: any,
    factory: ProcessorFactory,
  ): Promise<HandlerCallResult> {
    return this.delegateService.delegate(
      args.tool,
      args.args,
      ctx,
      factory,
      args.allowedTools,
    );
  }
}
