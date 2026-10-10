import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolCallOptions, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { TypeSafeClientService } from '../services/index.js';
import {
  TypeSafeEntrySchema,
  TypeSafeQuestionSchema,
  type TypeSafeResultMeta,
  type TypeSafeSystemOneResult,
  TypeSafeSystemOneResultSchema,
} from '../types/index.js';

/**
 * Zod schema for `typesafe_system_one` tool args: the `state` to evaluate and the named `questions` to answer.
 *
 * @public
 */
export const TypeSafeSystemOneArgsSchema = z.object({
  state: TypeSafeEntrySchema.describe('The text, JSON object or array the questions are asked about.'),
  questions: z
    .record(z.string(), TypeSafeQuestionSchema)
    .refine((questions) => Object.keys(questions).length > 0, { message: 'questions must not be empty' })
    .describe('Questions keyed by the names used to identify their answers.'),
});

/**
 * Args for `TypeSafeSystemOneTool`.
 *
 * @public
 */
export type TypeSafeSystemOneArgs = z.infer<typeof TypeSafeSystemOneArgsSchema>;

/**
 * Zod schema for `typesafe_system_one` tool config (`model`, `envApiKey`).
 *
 * @public
 */
export const TypeSafeSystemOneConfigSchema = z.object({
  model: z.string().optional(),
  envApiKey: z.string().optional(),
});

/**
 * Config for `TypeSafeSystemOneTool`.
 *
 * @public
 */
export type TypeSafeSystemOneConfig = z.infer<typeof TypeSafeSystemOneConfigSchema>;

/**
 * Tool that answers named yes/no (`noul`), `choice` and `score` questions about a state with TypeSafe AI.
 *
 * Build questions with the `noul`, `choice` and `score` helpers exported by this package. The model and API key
 * env var come from `options.config`. Returns {@link TypeSafeSystemOneResult} with the answers keyed by question
 * name, and {@link TypeSafeResultMeta} with the model and token usage.
 *
 * @providedBy TypeSafeModule
 * @public
 */
@Tool({
  name: 'typesafe_system_one',
  description:
    'Answers named questions about a state with TypeSafe AI. Question types: ' +
    '"noul" (yes/no, returns the probability of yes), ' +
    '"choice" (picks one of the labels in criteria, returns the label, confidence and probabilities) and ' +
    '"score" (rates against an ordered rubric of at least two levels, returns the expected score). ' +
    'Configure model and envApiKey via options.config.',
  schema: TypeSafeSystemOneArgsSchema,
  configSchema: TypeSafeSystemOneConfigSchema,
  resultSchema: TypeSafeSystemOneResultSchema,
  effects: 'none',
})
export class TypeSafeSystemOneTool extends BaseTool<
  TypeSafeSystemOneArgs,
  TypeSafeSystemOneConfig,
  TypeSafeSystemOneResult,
  TypeSafeResultMeta
> {
  @Inject() private readonly client: TypeSafeClientService;

  protected async handle(
    args: TypeSafeSystemOneArgs,
    ctx: RunContext,
    options?: ToolCallOptions<TypeSafeSystemOneConfig>,
  ): Promise<ToolEnvelope<TypeSafeSystemOneResult, TypeSafeResultMeta>> {
    const config = options?.config;
    const result = await this.client.systemOne(
      { state: args.state, questions: args.questions, ...(config?.model && { model: config.model }) },
      { envApiKey: config?.envApiKey, signal: ctx.signal },
    );

    return {
      data: result,
      metadata: {
        provider: 'typesafe',
        model: result.model,
        usage: { inputTokens: result.usage.input_tokens, outputTokens: result.usage.output_tokens },
      },
    };
  }
}
