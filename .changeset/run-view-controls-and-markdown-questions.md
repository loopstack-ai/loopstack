---
'@loopstack/loopstack-studio': patch
---

The run view draws a run's workflow-level widgets beside the picked prompt, and renders questions as Markdown.

The rules pick one prompt, documents first, so a workflow-level widget — the reply input at a gate, the button
that leaves a loop — was never seen while a card was active. Those are controls of the run, not alternatives
to the card. Every live one is now drawn under the picked prompt, each answering its own workflow, and the
one that was itself picked is not drawn twice.

A question asked through the text, confirm and choices prompts, and the answered card in the transcript,
renders as Markdown. An agent asked for one clear question writes a paragraph, often with a list, and a `<p>`
collapsed its line breaks and showed its formatting as literal characters.
