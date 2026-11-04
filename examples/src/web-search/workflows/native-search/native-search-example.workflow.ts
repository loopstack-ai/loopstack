import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { LlmGenerateTextTool, LlmMessageDocument } from '@loopstack/llm-provider';
import type { LlmContentBlock } from '@loopstack/llm-provider';

const NativeSearchExampleArgsSchema = z
  .object({
    question: z.string().default('What is the latest stable version of Node.js, and when was it released?'),
  })
  .strict();

type NativeSearchExampleArgs = z.infer<typeof NativeSearchExampleArgsSchema>;
type ServerToolUseBlock = Extract<LlmContentBlock, { type: 'server_tool_use' }>;
type ServerToolResultBlock = Extract<LlmContentBlock, { type: 'server_tool_result' }>;

interface Source {
  title: string;
  url: string;
}

@Workflow({
  title: 'Web Search - Native Search Example',
  description:
    "Lists Claude's native web search (claude_native_web_search) in the tools of one llm_generate_text call. Claude searches inside that call; the workflow reads the queries and the sources from the blocks of the reply.",
  schema: NativeSearchExampleArgsSchema,
})
export class NativeSearchExampleWorkflow extends BaseWorkflow<NativeSearchExampleArgs> {
  constructor(private readonly llmGenerateText: LlmGenerateTextTool) {
    super();
  }

  @Transition({ to: 'end' })
  async ask(state: Record<string, unknown>, ctx: RunContext<NativeSearchExampleArgs>) {
    await this.documentStore.save(LlmMessageDocument, { role: 'user', text: ctx.args.question });

    // The search tool is listed by name. The workflow never calls it — Claude searches inside this LLM call,
    // and the reply (saved as a message) holds the searches and their results as blocks.
    const result = await this.llmGenerateText.call(
      { prompt: ctx.args.question },
      { config: { provider: 'claude', tools: ['claude_native_web_search'] } },
    );

    const blocks = result.data.message.blocks ?? [];
    const queries = blocks
      .filter((b): b is ServerToolUseBlock => b.type === 'server_tool_use')
      .map((b) => b.input.query as string);
    // A failed search returns an error object instead of a list of results.
    const sources = blocks
      .filter((b): b is ServerToolResultBlock => b.type === 'server_tool_result')
      .flatMap((b) => (Array.isArray(b.content) ? (b.content as Source[]) : []))
      .map(({ title, url }) => ({ title, url }));

    await this.documentStore.save(LlmMessageDocument, {
      role: 'assistant',
      text: ['**Sources**', '', ...sources.map((s) => `- [${s.title}](${s.url})`)].join('\n'),
    });
    this.setResult({ queries, sources, answer: result.data.message.text });
  }
}
