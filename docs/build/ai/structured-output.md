---
title: AI Structured Output
description: Forcing LLMs to return structured JSON data using LlmGenerateObjectTool with Zod schemas. Provider-agnostic — works with Claude, OpenAI, and other providers.
---

# AI Structured Output

Use `LlmGenerateObjectTool` from `@loopstack/llm-provider` to generate structured data conforming to a Zod schema. Provider-agnostic — works with Claude, OpenAI, and other providers.

## Define a Document

```typescript
import { z } from 'zod';
import { Document } from '@loopstack/common';

export const FileDocumentSchema = z
  .object({
    filename: z.string(),
    description: z.string(),
    code: z.string(),
  })
  .strict();

export type FileDocumentType = z.infer<typeof FileDocumentSchema>;

@Document({
  schema: FileDocumentSchema,
  widget: './file-document.yaml',
})
export class FileDocument {
  filename: string;
  description: string;
  code: string;
}
```

## Workflow Example

```typescript
import { join } from 'node:path';
import { z } from 'zod';
import { BaseWorkflow, DocumentEntity, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { LlmGenerateObjectTool, LlmMessageDocument } from '@loopstack/llm-provider';
import { FileDocument, FileDocumentSchema, FileDocumentType } from './documents/file-document';

interface StructuredOutputState {
  language?: string;
  llmResult?: DocumentEntity<FileDocumentType>;
}

const StructuredOutputSchema = z.object({
  language: z.enum(['python', 'javascript', 'java', 'cpp', 'ruby', 'go', 'php']).default('python'),
});
type StructuredOutputArgs = z.infer<typeof StructuredOutputSchema>;

@Workflow({
  schema: StructuredOutputSchema,
})
export class PromptStructuredOutputWorkflow extends BaseWorkflow<StructuredOutputArgs> {
  constructor(private readonly llmGenerateObject: LlmGenerateObjectTool) {
    super();
  }

  @Transition({ to: 'ready' })
  async greeting(state: StructuredOutputState, ctx: RunContext<StructuredOutputArgs>) {
    await this.documentStore.save(
      LlmMessageDocument,
      { role: 'assistant', text: `Creating a Hello World script in ${ctx.args.language}...` },
      { key: 'status' },
    );
    this.assignState({ language: ctx.args.language });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async prompt(state: StructuredOutputState) {
    const result = await this.llmGenerateObject.call(
      {
        outputSchema: FileDocumentSchema,
        prompt: this.render(join(__dirname, 'templates', 'prompt.md'), { language: state.language }),
      },
      { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
    );

    const llmResult = await this.documentStore.save(FileDocument, result.data.data as FileDocumentType);
    this.assignState({ llmResult });
  }

  @Transition({ from: 'prompt_executed', to: 'end' })
  async respond(state: StructuredOutputState) {
    await this.documentStore.save(
      LlmMessageDocument,
      { role: 'assistant', text: `Generated: ${state.llmResult?.content?.description ?? ''}` },
      { key: 'status' },
    );
  }
}
```

## How It Works

1. Pass your Zod schema as `outputSchema` to `llmGenerateObject.call()`
2. The tool converts it to JSON Schema, and the provider forces the LLM to return data matching it
3. The tool validates the LLM's answer against the Zod schema and returns it as `result.data.data`
4. Save the result as a typed document using `this.documentStore.save()`

## Key Parameters

```typescript
await this.llmGenerateObject.call(
  {
    outputSchema: MyDocumentSchema,
    prompt: 'Generate structured data.',
  },
  { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
);
```

## Registry References

- [Structured Output example](/docs/examples/llm#structured-output) — Generates structured code files using the LLM provider
