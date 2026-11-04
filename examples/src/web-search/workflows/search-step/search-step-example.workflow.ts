import { z } from 'zod';
import { ClaudeWebSearchStepTool } from '@loopstack/claude-tools';
import type { WebSearchHit } from '@loopstack/claude-tools';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { LlmMessageDocument } from '@loopstack/llm-provider';

const SearchStepExampleArgsSchema = z
  .object({
    query: z.string().min(2).default('latest stable Node.js release'),
  })
  .strict();

type SearchStepExampleArgs = z.infer<typeof SearchStepExampleArgsSchema>;

@Workflow({
  title: 'Web Search - Search Step Example',
  description:
    'Calls claude_web_search_step from workflow code. The tool makes its own Claude request with the native web search and returns the hits; the workflow renders them as a list of links.',
  schema: SearchStepExampleArgsSchema,
})
export class SearchStepExampleWorkflow extends BaseWorkflow<SearchStepExampleArgs> {
  constructor(private readonly webSearch: ClaudeWebSearchStepTool) {
    super();
  }

  @Transition({ to: 'end' })
  async search(state: Record<string, unknown>, ctx: RunContext<SearchStepExampleArgs>) {
    // A step like any other tool call: the search runs in a separate Claude request, whose reply is not saved.
    const result = await this.webSearch.call({ query: ctx.args.query });

    // `results` interleaves the model's text with one block of hits per search.
    const hits: WebSearchHit[] = result.data.results.flatMap((entry) =>
      typeof entry === 'string' ? [] : entry.content,
    );

    await this.documentStore.save(LlmMessageDocument, {
      role: 'assistant',
      text: [`**Results for "${result.data.query}"**`, '', ...hits.map((h) => `- [${h.title}](${h.url})`)].join('\n'),
    });
    this.setResult({ query: result.data.query, hits });
  }
}
