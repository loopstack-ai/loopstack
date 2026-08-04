import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';

const ClassifyTicketSchema = z
  .object({
    text: z.string(),
  })
  .strict();

type ClassifyTicketArgs = z.infer<typeof ClassifyTicketSchema>;

export interface ClassificationResult {
  severity: 'high' | 'normal';
  reason: string;
}

export const ClassificationResultSchema = z.strictObject({
  severity: z.enum(['high', 'normal']),
  reason: z.string(),
});

const URGENCY_KEYWORDS = ['down', 'outage', 'urgent', 'critical'];

@Tool({
  name: 'classify_ticket',
  description: 'Classifies a support ticket as high or normal severity based on urgency keywords.',
  schema: ClassifyTicketSchema,
  resultSchema: ClassificationResultSchema,
  effects: 'none',
})
export class ClassifyTicketTool extends BaseTool<ClassifyTicketArgs, object, ClassificationResult> {
  protected async handle(args: ClassifyTicketArgs): Promise<ToolEnvelope<ClassificationResult>> {
    const matched = URGENCY_KEYWORDS.find((word) => args.text.toLowerCase().includes(word));
    return Promise.resolve({
      data: matched
        ? { severity: 'high', reason: `matched urgency keyword "${matched}"` }
        : { severity: 'normal', reason: 'no urgency keywords' },
    });
  }
}
