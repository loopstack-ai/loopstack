import Anthropic from '@anthropic-ai/sdk';

const CACHE_CONTROL: Anthropic.CacheControlEphemeral = { type: 'ephemeral' };

/**
 * Returns a copy of the API call options with prompt caching breakpoints applied.
 *
 * Breakpoints are placed on:
 * 1. The system prompt (stable across turns)
 * 2. The last tool definition (stable across turns)
 * 3. The last content block of the last message (covers growing conversation)
 *
 * Does not mutate the input — returns new objects with cache_control markers.
 */
export function applyCacheBreakpoints(options: {
  system?: string | Anthropic.TextBlockParam[];
  tools?: Anthropic.Tool[];
  messages: Anthropic.MessageParam[];
}): {
  system?: string | Anthropic.TextBlockParam[];
  tools?: Anthropic.Tool[];
  messages: Anthropic.MessageParam[];
} {
  // 1. System prompt → convert string to block array with cache_control
  let system: string | Anthropic.TextBlockParam[] | undefined = options.system;
  if (system && typeof system === 'string') {
    system = [{ type: 'text', text: system, cache_control: CACHE_CONTROL }];
  }

  // 2. Last tool definition — shallow-clone the array and mark the last entry
  let tools = options.tools;
  if (tools?.length) {
    tools = [...tools];
    const last = tools.length - 1;
    tools[last] = { ...tools[last], cache_control: CACHE_CONTROL };
  }

  // 3. Last message — clone only the last message and mark its last content block
  let messages = options.messages;
  if (messages.length > 0) {
    messages = [...messages];
    const lastIdx = messages.length - 1;
    const lastMsg = messages[lastIdx];

    if (typeof lastMsg.content === 'string') {
      messages[lastIdx] = {
        ...lastMsg,
        content: [{ type: 'text', text: lastMsg.content, cache_control: CACHE_CONTROL }],
      };
    } else if (Array.isArray(lastMsg.content) && lastMsg.content.length > 0) {
      const blocks: Anthropic.ContentBlockParam[] = [...lastMsg.content];
      const lastBlockIdx = blocks.length - 1;
      blocks[lastBlockIdx] = { ...blocks[lastBlockIdx], cache_control: CACHE_CONTROL } as Anthropic.ContentBlockParam;
      messages[lastIdx] = { ...lastMsg, content: blocks };
    }
  }

  return { system, tools, messages };
}
