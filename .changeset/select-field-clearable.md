---
'@loopstack/loopstack-studio': patch
---

Let an optional select be left blank, and unset again.

An untouched dropdown defaulted to an empty string, which is a real value for a string field and a type
error for an enum — so `z.enum([...]).optional()` rejected the args of any form with a blank optional
dropdown in it. An untouched field is now `undefined` and is omitted on submit. Optional selects also gain a
`— none —` entry, relabelled with `clearLabel`, since a dropdown with no way back made the first choice
permanent.
