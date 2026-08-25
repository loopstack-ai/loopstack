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
};

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
