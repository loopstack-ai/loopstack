import { BlockConfig, HandlerCallResult } from '@loopstack/common';
import { Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  ProcessorFactory,
  Tool,
} from '../../workflow-processor';
import { TemplateExpression } from '@loopstack/contracts/schemas';
import { DelegateService } from '../services';

const DelegateToolSchema = z.object({
  tool: z.string(),
  args: z.any().optional(),
  allowed: z.array(z.string()).optional(),
}).strict();

const DelegateToolConfigSchema = z.object({
  tool: z.union([
    z.string(),
    TemplateExpression,
  ]),
  args: z.any().optional(),
  allowed: z.array(z.string()).optional(),
}).strict();

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

  constructor(
    private readonly delegateService: DelegateService,
  ) {
    super();
  }

  async execute(args: DelegateToolType, ctx: any, factory: ProcessorFactory): Promise<HandlerCallResult> {

    if (args.allowed !== undefined && args.allowed.includes(args.tool)) {
      throw new Error(`Delegate tool call ${args.tool} is not allowed.`);
    }

    return this.delegateService.delegate(
      args.tool,
      args.args,
      ctx,
      factory,
    );
  }
}
