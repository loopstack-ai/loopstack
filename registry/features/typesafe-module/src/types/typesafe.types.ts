import { z } from 'zod';

/**
 * Text, a JSON object or array, or `null` — the shape TypeSafe accepts for state, instructions and criteria.
 *
 * @public
 */
export const TypeSafeEntrySchema = z.union([z.string(), z.record(z.string(), z.json()), z.array(z.json())]).nullable();

/**
 * Zod schema for a yes/no question (`noul`).
 *
 * @public
 */
export const TypeSafeNoulQuestionSchema = z.object({
  type: z.literal('noul'),
  instructions: TypeSafeEntrySchema.optional(),
  criteria: z
    .object({
      true: TypeSafeEntrySchema.optional(),
      false: TypeSafeEntrySchema.optional(),
    })
    .nullable()
    .optional(),
});

/**
 * Zod schema for a question that selects one of the labels in `criteria` (`choice`).
 *
 * @public
 */
export const TypeSafeChoiceQuestionSchema = z.object({
  type: z.literal('choice'),
  instructions: TypeSafeEntrySchema.optional(),
  criteria: z.record(z.string(), TypeSafeEntrySchema),
});

/**
 * Zod schema for a question that scores against an ordered rubric of at least two levels (`score`).
 *
 * @public
 */
export const TypeSafeScoreQuestionSchema = z.object({
  type: z.literal('score'),
  instructions: TypeSafeEntrySchema.optional(),
  criteria: z.tuple([TypeSafeEntrySchema, TypeSafeEntrySchema], TypeSafeEntrySchema).readonly(),
});

/**
 * Zod schema for any TypeSafe question, discriminated by `type`.
 *
 * @public
 */
export const TypeSafeQuestionSchema = z.discriminatedUnion('type', [
  TypeSafeNoulQuestionSchema,
  TypeSafeChoiceQuestionSchema,
  TypeSafeScoreQuestionSchema,
]);

/**
 * A TypeSafe question (`noul`, `choice` or `score`).
 *
 * @public
 */
export type TypeSafeQuestion = z.infer<typeof TypeSafeQuestionSchema>;

/**
 * Zod schema for a yes/no answer: the probability of yes.
 *
 * @public
 */
export const TypeSafeNoulAnswerSchema = z.object({
  type: z.literal('noul'),
  noul: z.number(),
});

/**
 * Zod schema for a choice answer: the selected label, its confidence and the probability of every label.
 *
 * @public
 */
export const TypeSafeChoiceAnswerSchema = z.object({
  type: z.literal('choice'),
  choice: z.string(),
  confidence: z.number(),
  probabilities: z.record(z.string(), z.number()),
});

/**
 * Zod schema for a score answer: the expected score (may fall between levels), its confidence, the rubric and the
 * probability of every level.
 *
 * @public
 */
export const TypeSafeScoreAnswerSchema = z.object({
  type: z.literal('score'),
  score: z.number(),
  confidence: z.number(),
  legend: z.record(z.string(), TypeSafeEntrySchema),
  probabilities: z.record(z.string(), z.number()),
});

/**
 * Zod schema for any TypeSafe answer, discriminated by `type`.
 *
 * @public
 */
export const TypeSafeAnswerSchema = z.discriminatedUnion('type', [
  TypeSafeNoulAnswerSchema,
  TypeSafeChoiceAnswerSchema,
  TypeSafeScoreAnswerSchema,
]);

/**
 * A TypeSafe answer (`noul`, `choice` or `score`).
 *
 * @public
 */
export type TypeSafeAnswer = z.infer<typeof TypeSafeAnswerSchema>;

/**
 * Zod schema for the `typesafe_system_one` result: the model that answered, the answers keyed by question name,
 * and token usage as reported by the API.
 *
 * @public
 */
export const TypeSafeSystemOneResultSchema = z.object({
  model: z.string(),
  answers: z.record(z.string(), TypeSafeAnswerSchema),
  usage: z.object({
    input_tokens: z.number(),
    output_tokens: z.number(),
  }),
});

/**
 * Result of the `typesafe_system_one` tool.
 *
 * @public
 */
export type TypeSafeSystemOneResult = z.infer<typeof TypeSafeSystemOneResultSchema>;

/**
 * Metadata returned by `typesafe_system_one`: provider `typesafe`, the model that answered, and token usage.
 *
 * @public
 */
export type TypeSafeResultMeta = {
  provider: 'typesafe';
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
};

/**
 * Per-call client settings for `TypeSafeClientService`.
 *
 * @public
 */
export interface TypeSafeModelConfig {
  /** Model name (e.g. 'jev-latest'). Falls back to the SDK default: TYPESAFE_DEFAULT_MODEL, then 'jev-latest'. */
  model?: string;
  /** Environment variable name containing the API key. Falls back to TYPESAFE_API_KEY. */
  envApiKey?: string;
}
