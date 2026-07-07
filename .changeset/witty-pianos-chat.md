---
'@loopstack/cli': minor
---

Chat prompts work in the terminal: workflow-level `prompt-input` widgets (from `@Workflow({ widget })`) are discovered via the workflow config, render as a labeled input, and submit the raw message string the transition schema expects — chat-loop workflows like `prompt_input_chat_example` now converse round after round, in fresh and reattached sessions.
