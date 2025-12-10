import { BlockConfig, ToolResult, WithArguments } from '@loopstack/common';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { DelegateService } from '../services';
import { ToolBase } from '../../../workflow-processor';

const DelegateToolSchema = z
  .object({
    tool: z.string(),
    args: z.any().optional(),
    allowedTools: z.array(z.string()),
  })
  .strict();

type DelegateToolType = z.infer<typeof DelegateToolSchema>;

@Injectable()
@BlockConfig({
  config: {
    description: 'Delegate to another tool.',
  },
})
@WithArguments(DelegateToolSchema)
export class DelegateTool extends ToolBase<DelegateToolType> {
  protected readonly logger = new Logger(DelegateTool.name);

  constructor(private readonly delegateService: DelegateService) {
    super();
  }

  async execute(
    args: DelegateToolType,
    ctx: any,
  ): Promise<ToolResult> {
    return this.delegateService.delegate(
      args.tool,
      args.args,
      ctx,
      args.allowedTools,
    );
  }
}
