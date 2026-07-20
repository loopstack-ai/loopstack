import { z } from 'zod';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { LlmMessageDocument } from '@loopstack/llm-provider-module';
import { WebFetchTool } from '@loopstack/web-module';

interface WebFetchState {
  url?: string;
  summary?: string;
}

const WebFetchArgsSchema = z.object({
  url: z.url().default('https://loopstack.ai'),
  prompt: z
    .string()
    .default('Summarize this page in 3 bullet points.')
    .describe('Optional instruction applied to the fetched content. Leave empty for raw Markdown.'),
});

type WebFetchArgs = z.infer<typeof WebFetchArgsSchema>;

@Workflow({
  title: 'LLM - Web Fetch Example',
  description:
    'Fetches a URL, converts HTML to Markdown, and summarizes it with Claude using a user-provided prompt. Demonstrates the WebFetchTool from @loopstack/web-module.',
  schema: WebFetchArgsSchema,
})
export class WebFetchExampleWorkflow extends BaseWorkflow<WebFetchArgs> {
  constructor(private readonly webFetch: WebFetchTool) {
    super();
  }

  @Transition({ to: 'fetching' })
  async announce(state: WebFetchState, ctx: RunContext<WebFetchArgs>) {
    await this.documentStore.save(
      LlmMessageDocument,
      { role: 'assistant', text: `Fetching ${ctx.args.url}...` },
      { key: 'status' },
    );
  }

  @Transition({ from: 'fetching', to: 'fetched' })
  async fetch(state: WebFetchState, ctx: RunContext<WebFetchArgs>) {
    const result = await this.webFetch.call({
      url: ctx.args.url,
      prompt: ctx.args.prompt,
    });

    this.assignState({ url: ctx.args.url, summary: result.data.result });
  }

  @Transition({ from: 'fetched', to: 'end' })
  async respond(state: WebFetchState) {
    await this.documentStore.save(LlmMessageDocument, {
      role: 'assistant',
      text: state.summary ?? '(no content)',
    });
    this.setResult({ url: state.url, summary: state.summary ?? '' });
  }
}
