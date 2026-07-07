import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';

const AnalyzeTextSchema = z.object({
  text: z.string(),
});

type AnalyzeTextArgs = z.infer<typeof AnalyzeTextSchema>;

export interface AnalyzeTextToolResult {
  words: number;
  characters: number;
}

@Tool({
  name: 'analyze_text',
  description: 'Counts words and characters in a text. Its usage is metered by WordsProcessedQuotaCalculator.',
  schema: AnalyzeTextSchema,
})
export class AnalyzeTextTool extends BaseTool<AnalyzeTextArgs, object, AnalyzeTextToolResult> {
  protected async handle(args: AnalyzeTextArgs): Promise<ToolEnvelope<AnalyzeTextToolResult>> {
    const words = args.text.split(/\s+/).filter(Boolean).length;
    return Promise.resolve({ data: { words, characters: args.text.length } });
  }
}
