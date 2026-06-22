---
title: AI Structured Output
description: Forcing LLMs to return structured JSON data using LlmGenerateObjectTool with Zod schemas. Provider-agnostic — works with Claude, OpenAI, and other providers.
---

# AI Structured Output

Use `LlmGenerateObjectTool` from `@loopstack/llm-provider-module` to generate structured data conforming to a JSON Schema. Provider-agnostic — works with Claude, OpenAI, and other providers.

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
  widget: __dirname + '/file-document.yaml',
})
export class FileDocument {
  filename: string;
  description: string;
  code: string;
}
```

## Workflow Example

```typescript
import { toJSONSchema, z } from 'zod';
import { BaseWorkflow, DocumentEntity, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import type { LlmGenerateObjectResult } from '@loopstack/llm-provider-module';
import { LlmGenerateObjectTool, LlmMessageDocument } from '@loopstack/llm-provider-module';
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
      { id: 'status' },
    );
    this.assignState({ language: ctx.args.language });
  }

  @Transition({ from: 'ready', to: 'prompt_executed' })
  async prompt(state: StructuredOutputState) {
    const result = await this.llmGenerateObject.call(
      {
        outputSchema: toJSONSchema(FileDocumentSchema) as Record<string, unknown>,
        prompt: this.render(__dirname + '/templates/prompt.md', { language: state.language }),
      },
      { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
    );

    const objectResult = result.data as LlmGenerateObjectResult;
    const llmResult = await this.documentStore.save(FileDocument, objectResult.data as FileDocumentType, {
      validate: 'skip',
    });
    this.assignState({ llmResult });
  }

  @Transition({ from: 'prompt_executed', to: 'end' })
  async respond(state: StructuredOutputState) {
    await this.documentStore.save(
      LlmMessageDocument,
      { role: 'assistant', text: `Generated: ${state.llmResult?.content?.description ?? ''}` },
      { id: 'status' },
    );
  }
}
```

## How It Works

1. Convert your Zod schema to JSON Schema using `toJSONSchema()`
2. Pass the JSON Schema as `outputSchema` to `llmGenerateObject.call()`
3. The provider forces the LLM to return data matching the schema
4. Save the result as a typed document using `this.documentStore.save()`

## Key Parameters

```typescript
await this.llmGenerateObject.call(
  {
    outputSchema: toJSONSchema(MyDocumentSchema) as Record<string, unknown>,
    prompt: 'Generate structured data.',
  },
  { config: { provider: 'claude', model: 'claude-sonnet-4-6' } },
);
```

## Registry References

- [prompt-structured-output-example-workflow](https://loopstack.ai/registry/loopstack-prompt-structured-output-example-workflow) — Generates structured code files using the LLM provider
