---
'@loopstack/loopstack-studio': patch
---

Let a workflow-level `button` widget choose its style.

A workflow-level button is often the lesser of the actions on offer — an escape hatch beside the thing you
normally do — and rendering every one of them as the primary action said the opposite. The widget's
`variant` option is now honoured by `button` and `button-full-w`, with the same values the form buttons
already accept; anything unrecognised falls back to the default style.
