import { Injectable, Logger } from '@nestjs/common';
import {
  ContextInterface,
  Tool,
  ToolInterface,
  ToolResult,
} from '@loopstack/shared';
import { SchemaValidatorService, DocumentHelperService } from '../../common';
import { z } from 'zod';
import { WorkflowEntity } from '@loopstack/shared';
import { StateMachineInfoDto } from '@loopstack/shared/dist/dto/state-machine-info.dto';

@Injectable()
@Tool()
export class CreateErrorTool implements ToolInterface {
  private readonly logger = new Logger(CreateErrorTool.name);
  schema = z.object({
    message: z.string(),
    errorPlace: z.string().optional()
  });

  constructor(
    private actionHelperService: SchemaValidatorService,
    private documentHelperService: DocumentHelperService,
  ) {}

  async apply(
    props: z.infer<typeof this.schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    info: StateMachineInfoDto,
  ): Promise<ToolResult> {
    const validProps = this.schema.parse(props);

    let data = workflow?.currData;

    this.logger.error(`Create error: ${validProps.message}`);

    let document = this.documentHelperService.createDocumentWithSchema(
      {
        create: {
          name: 'error',
          content: {
            role: 'assistant',
            message: validProps.message,
          },
          schema: {
            type: 'object',
            ui: {
              widget: 'chat-message',
            },
          },
        },
      },
      undefined,
      {
        context,
        data,
        info,
      },
    );

    this.actionHelperService.validateDocument(document);

    return {
      data: {
        documents: [document],
        nextPlace: 'error',
      },
    };
  }
}
