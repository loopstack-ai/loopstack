---
'@loopstack/openai': minor
'@loopstack/claude': patch
---

A conversation can switch between the Claude and OpenAI providers between turns.

- Each provider replays an assistant message's stored native response (`meta.response`) only when `meta.provider` is
  its own id. Every other message is rebuilt from its normalized `text` and `blocks`.
- The OpenAI provider converts `tool_call` blocks to `tool_calls` and `tool_result` blocks to `role: 'tool'` messages,
  for document history and inline `messages` alike. It leaves out `thinking`, `server_tool_use` and
  `server_tool_result` blocks, and an assistant message with nothing left to send.
- The OpenAI provider rejects a call that lists a server tool, such as `claude_native_web_search`, with
  `Server tool '<name>' is not supported by the openai provider`.
