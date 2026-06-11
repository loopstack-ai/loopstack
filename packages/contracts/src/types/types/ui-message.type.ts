import { z } from 'zod';

// ---------------------------------------------------------------------------
// Content block schemas
// ---------------------------------------------------------------------------

export const UITextBlockSchema = z.object({ type: z.literal('text'), text: z.string() });
export type UITextBlock = z.infer<typeof UITextBlockSchema>;

export const UIThinkingBlockSchema = z.object({ type: z.literal('thinking'), text: z.string() });
export type UIThinkingBlock = z.infer<typeof UIThinkingBlockSchema>;

export const UIToolCallBlockSchema = z.object({
  type: z.literal('tool_call'),
  id: z.string(),
  name: z.string(),
  args: z.record(z.string(), z.unknown()),
});
export type UIToolCallBlock = z.infer<typeof UIToolCallBlockSchema>;

export const UIServerToolUseBlockSchema = z.object({
  type: z.literal('server_tool_use'),
  id: z.string(),
  name: z.string(),
  input: z.record(z.string(), z.unknown()),
});
export type UIServerToolUseBlock = z.infer<typeof UIServerToolUseBlockSchema>;

export const UIServerToolResultBlockSchema = z.object({
  type: z.literal('server_tool_result'),
  toolUseId: z.string(),
  content: z.unknown(),
});
export type UIServerToolResultBlock = z.infer<typeof UIServerToolResultBlockSchema>;

export const UIToolResultBlockSchema = z.object({
  type: z.literal('tool_result'),
  toolCallId: z.string(),
  content: z.string(),
  isError: z.boolean(),
});
export type UIToolResultBlock = z.infer<typeof UIToolResultBlockSchema>;

// ---------------------------------------------------------------------------
// Unions
// ---------------------------------------------------------------------------

export const UIContentBlockSchema = z.discriminatedUnion('type', [
  UITextBlockSchema,
  UIThinkingBlockSchema,
  UIToolCallBlockSchema,
  UIServerToolUseBlockSchema,
  UIServerToolResultBlockSchema,
  UIToolResultBlockSchema,
]);
export type UIContentBlock = z.infer<typeof UIContentBlockSchema>;

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------

export const UIMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().optional(),
  blocks: z.array(UIContentBlockSchema).optional(),
});
export type UIMessage = z.infer<typeof UIMessageSchema>;
