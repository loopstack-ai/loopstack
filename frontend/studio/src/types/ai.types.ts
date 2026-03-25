/**
 * Local AI types replacing the Vercel AI SDK ('ai') package.
 * These are simple interfaces matching the shapes our components actually use.
 */

// ---------------------------------------------------------------------------
// UI Message types (used by AiMessage renderer and ai-elements components)
// ---------------------------------------------------------------------------

export interface UIMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  parts: UIMessagePart[];
}

export type UIMessagePart = TextUIPart | ReasoningUIPart | ToolUIPart | FileUIPart | SourceUIPart;

export interface TextUIPart {
  type: 'text';
  text: string;
}

export interface ReasoningUIPart {
  type: 'reasoning';
  text: string;
}

export type ToolState =
  | 'input-streaming'
  | 'input-available'
  | 'approval-requested'
  | 'approval-responded'
  | 'output-available'
  | 'output-error'
  | 'output-denied';

export interface ToolUIPart {
  type: `tool-${string}`;
  toolCallId: string;
  input: Record<string, unknown>;
  state: ToolState;
  output?: { type: string; value: string };
  errorText?: string;
}

export type DynamicToolUIPart = ToolUIPart;

export interface FileUIPart {
  type: 'file';
  filename?: string;
  mediaType: string;
  url?: string;
  data?: string;
}

export interface SourceUIPart {
  type: 'source-url';
  url: string;
  title?: string;
}

// ---------------------------------------------------------------------------
// Chat & usage types
// ---------------------------------------------------------------------------

export type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error';

export interface LanguageModelUsage {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
}

// ---------------------------------------------------------------------------
// Generated image
// ---------------------------------------------------------------------------

export interface GeneratedImage {
  base64: string;
  uint8Array?: Uint8Array;
  mediaType?: string;
}

/** @deprecated Use GeneratedImage instead */
export type Experimental_GeneratedImage = GeneratedImage;

// ---------------------------------------------------------------------------
// Model message types (used by AiMessageContent / DocumentMessageRenderer)
// ---------------------------------------------------------------------------

export type DataContent = string | Uint8Array | ArrayBuffer | URL;

export interface ModelMessage {
  role: string;
  content: string | MessageContentPart[];
}

export type MessageContentPart = TextPart | ImagePart | FilePart | ToolCallPart | ToolResultPart;

export interface TextPart {
  type: 'text';
  text: string;
}

export interface ImagePart {
  type: 'image';
  image: DataContent;
  mediaType?: string;
}

export interface FilePart {
  type: 'file';
  data: DataContent;
  mediaType: string;
  filename?: string;
}

export interface ToolCallPart {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args?: Record<string, unknown>;
  input?: unknown;
  providerExecuted?: boolean;
}

export interface ToolResultPart {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  result?: unknown;
  output?: unknown;
}

// ---------------------------------------------------------------------------
// Type guards & helpers
// ---------------------------------------------------------------------------

export function isTextUIPart(part: UIMessagePart): part is TextUIPart {
  return part.type === 'text';
}

export function isReasoningUIPart(part: UIMessagePart): part is ReasoningUIPart {
  return part.type === 'reasoning';
}

export function isToolOrDynamicToolUIPart(part: UIMessagePart): part is ToolUIPart {
  return part.type.startsWith('tool-');
}

export function getToolOrDynamicToolName(part: ToolUIPart): string {
  return part.type.replace(/^tool-/, '');
}
