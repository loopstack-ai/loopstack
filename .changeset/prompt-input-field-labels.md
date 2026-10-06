---
'@loopstack/loopstack-studio': patch
---

The `prompt-input` widget shows each field's label inside its select, in front of the chosen value.

Every field starts with a value, so a select used to show only that value, and two fields with the same
default (`none` and `none`) could not be told apart without opening them. Each select now reads, for
example, "Area core" or "Priority none". The submitted payload is unchanged.
