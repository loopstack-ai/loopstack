import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pc from 'picocolors';
import type { DocumentWidget } from '../types.js';

interface MessageBlock {
  type?: string;
  id?: string;
  text?: string;
  name?: string;
  args?: unknown;
  content?: unknown;
  isError?: boolean;
}

/** Tool results beyond this render truncated — Studio collapses them entirely. */
const MAX_TOOL_RESULT_LINES = 8;

/**
 * One llm-message document: message text (unless its tokens already
 * streamed), tool calls as `⚒ name {args}`, tool results as `→ result`.
 */
export const llmMessageWidget: DocumentWidget = (content, ctx, out) => {
  const blocks = Array.isArray(content.blocks) ? (content.blocks as MessageBlock[]) : [];
  const streamed = typeof content.id === 'string' && content.id.length > 0 && !!ctx.streamedMessageIds?.has(content.id);

  if (!streamed) {
    const text =
      typeof content.text === 'string' && content.text.trim()
        ? content.text
        : blocks
            .filter((block) => block.type === 'text' && typeof block.text === 'string')
            .map((block) => block.text)
            .join('\n');
    if (text.trim()) {
      const role = typeof content.role === 'string' ? `${pc.dim(`${content.role}:`)}\n` : '';
      out.block(`${role}${text}`);
    }
  }

  // Tool machinery is dim throughout; only message content renders in full
  // color. Tool calls already rendered live from stream events are skipped —
  // providers without tool_call events still get theirs printed here.
  for (const block of blocks) {
    if (block.type === 'tool_call') {
      if (typeof block.id === 'string' && ctx.streamedToolCallIds?.has(block.id)) continue;
      out.line(pc.dim(`⚒ ${block.name ?? 'tool'} ${JSON.stringify(block.args ?? {})}`));
    } else if (block.type === 'tool_result') {
      const mark = block.isError ? pc.red('✗') : '→';
      out.line(pc.dim(`  ${mark} ${truncateToolResult(formatToolResult(block.content))}`));
    }
  }

  const footer = formatCompletionMeta(content.meta);
  if (footer) out.line(pc.dim(footer));
};

interface CompletionMeta {
  model?: string;
  costUsd?: number;
  numTurns?: number;
  durationMs?: number;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
  };
}

/** Dim one-line completion stats (turns, cost, tokens, duration) for a message that carries `meta`. */
function formatCompletionMeta(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const meta = raw as CompletionMeta;
  const parts: string[] = [];
  if (typeof meta.numTurns === 'number') parts.push(`${meta.numTurns} turn${meta.numTurns === 1 ? '' : 's'}`);
  if (typeof meta.costUsd === 'number') parts.push(`$${meta.costUsd.toFixed(4)}`);
  const inTok = fmtTokens(meta.usage?.inputTokens);
  const outTok = fmtTokens(meta.usage?.outputTokens);
  if (inTok && outTok) parts.push(`${inTok} in / ${outTok} out`);
  const cache = (meta.usage?.cacheReadInputTokens ?? 0) + (meta.usage?.cacheCreationInputTokens ?? 0);
  if (cache) parts.push(`${fmtTokens(cache)} cache`);
  if (typeof meta.durationMs === 'number') parts.push(`${(meta.durationMs / 1000).toFixed(1)}s`);
  if (meta.model) parts.push(meta.model);
  return parts.length ? parts.join(' · ') : undefined;
}

function fmtTokens(n: number | undefined): string | null {
  if (n == null) return null;
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

/**
 * Large tool results render as a preview; the full content goes to a temp
 * file whose path is the "view" affordance (open it in any pager/editor).
 */
function truncateToolResult(text: string): string {
  const lines = text.split('\n');
  if (lines.length <= MAX_TOOL_RESULT_LINES) return text;
  const preview = lines.slice(0, MAX_TOOL_RESULT_LINES).join('\n');
  const hidden = lines.length - MAX_TOOL_RESULT_LINES;
  const file = writeFullResult(text);
  const view = file ? ` — full result: ${file}` : '';
  return `${preview}\n… (+${hidden} lines${view})`;
}

function writeFullResult(text: string): string | undefined {
  try {
    const dir = join(tmpdir(), 'loopstack-cli');
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `tool-result-${randomUUID()}.txt`);
    writeFileSync(file, text);
    return file;
  } catch {
    return undefined;
  }
}

/** Tool result content is usually a JSON-encoded string — unwrap it for display. */
function formatToolResult(content: unknown): string {
  if (typeof content !== 'string') return JSON.stringify(content);
  try {
    const parsed: unknown = JSON.parse(content);
    return typeof parsed === 'string' ? parsed : content;
  } catch {
    return content;
  }
}
