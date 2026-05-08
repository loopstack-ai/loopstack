import type { LlmContentBlock, LlmGenerateTextResult } from '../types';

export function extractText(result: LlmGenerateTextResult): string {
  const content = result.message.content;
  if (!content || typeof content === 'string') return (content as string) ?? '';
  return (content as LlmContentBlock[])
    .filter((block) => block.type === 'text')
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join('\n');
}
