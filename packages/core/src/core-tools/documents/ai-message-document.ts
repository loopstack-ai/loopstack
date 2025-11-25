import { BlockConfig } from '@loopstack/common';
import { TemplateExpression } from '@loopstack/contracts/schemas';
import { z } from 'zod';
import { Document } from '../../workflow-processor';
import { Expose } from 'class-transformer';

const AiMessageDocumentSchema = z.object({
  id: z.string(),
  role: z.union([
    z.literal('system'),
    z.literal('user'),
    z.literal('assistant'),
  ]),
  metadata: z.any().optional(),
  parts: z.array(z.any()),
});

const AiMessageDocumentConfigSchema = z.object({
  id: z.union([TemplateExpression, z.string()]),
  role: z.union([
    TemplateExpression,
    z.literal('system'),
    z.literal('user'),
    z.literal('assistant'),
  ]),
  metadata: z.union([TemplateExpression, z.any()]).optional(),
  parts: z.union([TemplateExpression, z.array(z.any())]),
});

@BlockConfig({
  config: {
    type: 'document',
    description: 'Ai Message Document.',
  },
  properties: AiMessageDocumentSchema,
  configSchema: AiMessageDocumentConfigSchema,
  configFile: __dirname + '/ai-message-document.yaml',
})
export class AiMessageDocument extends Document {
  @Expose()
  id: string;

  @Expose()
  role: 'system' | 'user' | 'assistant';

  @Expose()
  metadata?: any;

  @Expose()
  parts: Array<any>;
}
