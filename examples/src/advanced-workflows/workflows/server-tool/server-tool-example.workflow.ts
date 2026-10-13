import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { LlmGenerateTextTool } from '@loopstack/llm-provider';
import type { LlmContentBlock } from '@loopstack/llm-provider';

const ServerToolExampleArgsSchema = z
  .object({
    question: z.string().default('What is the sum of the first 100 prime numbers?'),
  })
  .strict();

type ServerToolExampleArgs = z.infer<typeof ServerToolExampleArgsSchema>;
type ServerToolUseBlock = Extract<LlmContentBlock, { type: 'server_tool_use' }>;
type ServerToolResultBlock = Extract<LlmContentBlock, { type: 'server_tool_result' }>;

@Workflow({
  title: 'Advanced - Server Tool Example',
  description:
    'Authoring a server tool — a tool the LLM provider runs itself. Claude runs code in its sandbox to answer a question.',
  schema: ServerToolExampleArgsSchema,
})
export class ServerToolExampleWorkflow extends BaseWorkflow<ServerToolExampleArgs> {
  constructor(private readonly llmGenerateText: LlmGenerateTextTool) {
    super();
  }

  @Transition({ to: 'end' })
  async ask(state: Record<string, unknown>, ctx: RunContext<ServerToolExampleArgs>) {
    // The server tool is listed by name. The workflow never calls it — Claude runs it inside this LLM call.
    const result = await this.llmGenerateText.call(
      { prompt: `${ctx.args.question} Run code to compute the answer.` },
      { config: { provider: 'claude', tools: ['example_code_execution'] } },
    );

    // Claude's use of the tool and the tool's result come back as blocks of the reply.
    const blocks = result.data.message.blocks ?? [];
    const toolUse = blocks.find((b): b is ServerToolUseBlock => b.type === 'server_tool_use');
    const toolResult = blocks.find(
      (b): b is ServerToolResultBlock => b.type === 'server_tool_result' && b.toolUseId === toolUse?.id,
    );

    this.setResult({
      code: toolUse?.input,
      output: (toolResult?.content as { stdout?: string } | undefined)?.stdout,
      answer: result.data.message.text,
    });
  }
}
