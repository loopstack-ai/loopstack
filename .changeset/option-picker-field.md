---
'@loopstack/loopstack-studio': patch
---

Add the `option-picker` form widget: a choice between options the document itself carries.

A radio or a select reads its entries from the schema, which is declared once per document class. Some
choices differ per run — the ways an agent proposes to fix one ticket — and no schema can list them in advance.
The `option-picker` field's value holds the options and the pick together: `{ options: [{ value, label,
summary, detail, recommended }], selected }`. The form submits the same value with `selected` changed.

Each option is drawn as its own block, with a label, a summary and a smaller detail, and the recommended one
is marked, so a person can choose between them without reading anything else.

A declared widget now wins over a field's shape. The form element dispatched every object or array field into
nested fields before it looked at the widget, so no widget could ever draw a structured value. A field whose
document names a registered widget is drawn by that widget.
