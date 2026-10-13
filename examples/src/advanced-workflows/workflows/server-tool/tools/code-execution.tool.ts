import { ServerTool, Tool } from '@loopstack/common';

/**
 * A server tool: Anthropic runs it, not this app. It has no `handle()` and no `call()` — its only job is to return
 * the provider-native tool spec, which `llm_generate_text` sends to Claude when the tool is listed in `tools`.
 */
@Tool({
  name: 'example_code_execution',
  description: "Claude's provider-native code execution. Claude runs code in Anthropic's sandbox inside the LLM call.",
  effects: 'none',
})
export class CodeExecutionTool extends ServerTool {
  toServerToolConfig(): unknown {
    return { type: 'code_execution_20260120', name: 'code_execution' };
  }
}
