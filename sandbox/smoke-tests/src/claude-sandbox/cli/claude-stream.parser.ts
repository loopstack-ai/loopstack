import { Injectable } from '@nestjs/common';
import { ClaudeRunStats } from './claude-cli.types';

// The final `result` event of a `stream-json` run carries the aggregate stats.
interface ClaudeResultEvent {
  type?: string;
  session_id?: string;
  result?: string;
  is_error?: boolean;
  num_turns?: number;
  duration_ms?: number;
  total_cost_usd?: number;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

interface ClaudeContentBlock {
  type?: string;
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
}

interface ClaudeStreamEvent {
  type?: string;
  message?: { content?: ClaudeContentBlock[] };
}

const MAX_TRANSCRIPT_STEPS = 60;
const MAX_DETAIL_CHARS = 120;

/**
 * Parses Claude Code's `--output-format stream-json` output (newline-delimited JSON events):
 * extracting run statistics from the final `result` event and rendering a live transcript.
 */
@Injectable()
export class ClaudeStreamParser {
  parseStats(raw: string): ClaudeRunStats {
    const event = this.extractResultEvent(raw);
    if (!event) {
      return {
        result: raw,
        isError: true,
        numTurns: 0,
        durationMs: 0,
        costUsd: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheTokens: 0,
      };
    }
    const usage = event.usage ?? {};
    return {
      sessionId: event.session_id,
      result: event.result ?? raw,
      isError: event.is_error ?? false,
      numTurns: event.num_turns ?? 0,
      durationMs: event.duration_ms ?? 0,
      costUsd: event.total_cost_usd ?? 0,
      inputTokens: usage.input_tokens ?? 0,
      outputTokens: usage.output_tokens ?? 0,
      cacheTokens: (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0),
    };
  }

  /** Renders assistant text and tool-use steps into a compact, live-updating markdown transcript. */
  toMarkdown(raw: string, heading: string): string {
    const parts: string[] = [];
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let ev: ClaudeStreamEvent;
      try {
        ev = JSON.parse(trimmed) as ClaudeStreamEvent;
      } catch {
        continue;
      }
      if (ev.type !== 'assistant' || !ev.message?.content) continue;
      for (const block of ev.message.content) {
        if (block.type === 'text' && block.text?.trim()) parts.push(block.text.trim());
        else if (block.type === 'tool_use' && block.name) parts.push(this.summarizeToolUse(block.name, block.input));
      }
    }
    if (!parts.length) return '';
    const tail = parts.slice(-MAX_TRANSCRIPT_STEPS);
    const elided = parts.length > tail.length ? `_…${parts.length - tail.length} earlier steps elided…_\n\n` : '';
    return `### ${heading}\n\n${elided}${tail.join('\n\n')}`;
  }

  private summarizeToolUse(name: string, input?: Record<string, unknown>): string {
    const detail = this.toolDetail(name, input);
    return detail ? `\`🔧 ${name}\` \`${detail}\`` : `\`🔧 ${name}\``;
  }

  private toolDetail(name: string, input?: Record<string, unknown>): string {
    if (!input) return '';
    const str = (key: string): string | undefined => {
      const v = input[key];
      return typeof v === 'string' ? v : undefined;
    };

    let value: string | undefined;
    switch (name) {
      case 'Bash':
        value = str('command');
        break;
      case 'Read':
      case 'Write':
      case 'Edit':
      case 'MultiEdit':
        value = str('file_path');
        break;
      case 'NotebookEdit':
        value = str('notebook_path');
        break;
      case 'Glob':
      case 'Grep':
        value = str('pattern');
        break;
      case 'WebFetch':
        value = str('url');
        break;
      case 'Task':
        value = str('description');
        break;
      default:
        // Unknown/MCP tools: fall back to whichever common field is present.
        value =
          str('command') ?? str('file_path') ?? str('path') ?? str('pattern') ?? str('query') ?? str('description');
    }
    if (!value) return '';

    const oneLine = value.replace(/`/g, "'").replace(/\s+/g, ' ').trim();
    return oneLine.length > MAX_DETAIL_CHARS ? `${oneLine.slice(0, MAX_DETAIL_CHARS - 1)}…` : oneLine;
  }

  // Find the final `result` event (NDJSON); also tolerate a single JSON object (`--output-format json`).
  private extractResultEvent(raw: string): ClaudeResultEvent | null {
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const ev = JSON.parse(lines[i]) as ClaudeResultEvent;
        if (ev.type === 'result' || (lines.length === 1 && ev.result !== undefined)) {
          return ev;
        }
      } catch {
        /* partial/non-JSON line */
      }
    }
    return null;
  }
}
