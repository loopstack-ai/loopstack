import { Logger } from '@nestjs/common';
import {
  Handler,
  HandlerInterface,
  HandlerCallResult,
  TemplateExpression,
  WorkflowEntity,
  ContextInterface,
} from '@loopstack/shared';
import { z } from 'zod';
import { jsonSchemaToZod } from 'json-schema-to-zod';

const config = z
  .object({
    documentId: z.union([TemplateExpression, z.string()]),
    message: z.union([TemplateExpression, z.string()]).optional(),
  })
  .strict();

const schema = z
  .object({
    documentId: z.string(),
    message: z.string().optional(),
  })
  .strict();

@Handler({
  config,
  schema,
})
export class ValidateDocumentHandler implements HandlerInterface {
  private readonly logger = new Logger(ValidateDocumentHandler.name);

  private createZod(jsonSchema: any): z.ZodType {
    const zodSchemaString = jsonSchemaToZod(jsonSchema);
    return new Function('z', `return ${zodSchemaString}`)(z);
  }

  async apply(
    props: z.infer<typeof schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
  ): Promise<HandlerCallResult> {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }

    let document = workflow.documents.find(
      (item) => item.id === props.documentId,
    );
    if (!document) {
      throw new Error(`Document with ID ${props.documentId} not found.`);
    }

    const zodSchema = this.createZod(document.schema);
    if (!zodSchema) {
      throw Error(`No schema defined.`);
    }

    try {
      const result = zodSchema.parse(document.schema);

      return {
        success: true,
        data: {
          valid: true,
          result,
          error: null,
        },
      };
    } catch (error) {
      if (props.message) {
        throw new Error(props.message);
      }

      throw error;
    }
  }
}
