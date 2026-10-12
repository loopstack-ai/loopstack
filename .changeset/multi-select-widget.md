---
'@loopstack/loopstack-studio': minor
---

Forms have a `multi-select` widget: several picks from a list the document carries.

- The field's value is `{ options: string[], selected: string[] }`, so the list can differ per run. Submitting returns
  the same value with `selected` changed.
- The picks show as chips with a remove button. The list opens in a searchable popover, and a search that matches no
  entry can be added as a pick of its own.
- A field marked `required` does not submit with nothing picked.
