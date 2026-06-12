import type { UIContentBlock } from '@loopstack/contracts/types';

export interface ContentSummary {
  kind: 'string' | 'ui-message' | 'object' | 'array' | 'null' | 'unknown';
  role?: string;
  messageId?: string;
  stopReason?: string;
  streaming?: boolean;
  charCount?: number;
  itemCount?: number;
  blocks?: { type: string; count: number; labels?: string[] }[];
  topLevelKeys?: string[];
}

export interface WorkflowDebugContext {
  workflowId: string;
  workflowName: string;
  title: string;
  status: string;
  place: string;
  isActive: boolean;
  isDocumentActive: boolean;
  parentWorkflowId?: string;
  parentTitle?: string;
}

export interface ApiResponseInfo {
  model?: string;
  id?: string;
  stopReason?: string;
  usage?: {
    input?: number;
    output?: number;
    cacheRead?: number;
    cacheWrite?: number;
    reasoning?: number;
  };
}

export function summarizeDocumentContent(content: unknown): ContentSummary {
  if (content == null) return { kind: 'null' };
  if (typeof content === 'string') {
    return { kind: 'string', charCount: content.length };
  }
  if (Array.isArray(content)) {
    return { kind: 'array', itemCount: content.length };
  }
  if (typeof content !== 'object') return { kind: 'unknown' };

  const record = content as Record<string, unknown>;

  if ('role' in record && ('text' in record || 'blocks' in record)) {
    const role = String(record.role);
    const messageId = typeof record.id === 'string' ? record.id : undefined;
    const stopReason = typeof record.stopReason === 'string' ? record.stopReason : undefined;
    const text = typeof record.text === 'string' ? record.text : undefined;
    const blocks = Array.isArray(record.blocks) ? (record.blocks as UIContentBlock[]) : undefined;

    if (blocks && blocks.length > 0) {
      const blockCounts = new Map<string, { count: number; labels: string[] }>();

      for (const block of blocks) {
        const existing = blockCounts.get(block.type) ?? { count: 0, labels: [] };
        existing.count += 1;
        if (block.type === 'tool_call' || block.type === 'server_tool_use') {
          existing.labels.push(block.name);
        }
        blockCounts.set(block.type, existing);
      }

      const blockCharCount = blocks.reduce((total, block) => {
        if (block.type === 'text' || block.type === 'thinking') return total + block.text.length;
        if (block.type === 'tool_result') return total + block.content.length;
        return total;
      }, 0);

      return {
        kind: 'ui-message',
        role,
        messageId,
        stopReason,
        charCount: text?.length ?? blockCharCount,
        blocks: [...blockCounts.entries()].map(([type, { count, labels }]) => ({
          type,
          count,
          labels: labels.length > 0 ? labels : undefined,
        })),
      };
    }

    return {
      kind: 'ui-message',
      role,
      messageId,
      stopReason,
      charCount: text?.length ?? 0,
    };
  }

  const keys = Object.keys(record);
  return {
    kind: 'object',
    topLevelKeys: keys,
    charCount: JSON.stringify(content).length,
  };
}

export function extractApiResponseInfo(response: unknown): ApiResponseInfo {
  if (!response || typeof response !== 'object') return {};
  const record = response as Record<string, unknown>;

  if (record.usage && typeof record.usage === 'object') {
    const usage = record.usage as Record<string, number>;
    return {
      model: typeof record.model === 'string' ? record.model : undefined,
      id: typeof record.id === 'string' ? record.id : undefined,
      stopReason: typeof record.stop_reason === 'string' ? record.stop_reason : undefined,
      usage: {
        input: usage.input_tokens,
        output: usage.output_tokens,
        cacheRead: usage.cache_read_input_tokens,
        cacheWrite: usage.cache_creation_input_tokens,
      },
    };
  }

  if (Array.isArray(record.choices)) {
    const choice = record.choices[0] as Record<string, unknown> | undefined;
    const usage = record.usage as Record<string, number> | undefined;
    const details = usage?.prompt_tokens_details as Record<string, number> | undefined;
    return {
      model: typeof record.model === 'string' ? record.model : undefined,
      id: typeof record.id === 'string' ? record.id : undefined,
      stopReason: typeof choice?.finish_reason === 'string' ? choice.finish_reason : undefined,
      usage: usage
        ? {
            input: usage.prompt_tokens,
            output: usage.completion_tokens,
            cacheRead: details?.cached_tokens,
            reasoning: (usage as Record<string, number>).reasoning_tokens,
          }
        : undefined,
    };
  }

  return {};
}

export function formatRelativeTime(date: Date | string): string {
  const target = new Date(date).getTime();
  if (Number.isNaN(target)) return String(date);

  const diffMs = Date.now() - target;
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 48) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

export function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

export function formatNumber(value?: number): string {
  if (value == null) return '—';
  return value.toLocaleString();
}
