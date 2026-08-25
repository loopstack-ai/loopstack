import { collectForm } from './collect/form.collect.js';
import { collectChoices, collectConfirm, collectText } from './collect/prompts.collect.js';
import { collectSecretInput } from './collect/secret-input.collect.js';
import { collectButton, collectPromptInput } from './collect/workflow.collect.js';
import { formWidget } from './document/form.widget.js';
import { jsonWidget } from './document/json.widget.js';
import { linkWidget } from './document/link.widget.js';
import { llmMessageWidget } from './document/llm-message.widget.js';
import { errorWidget, markdownWidget, messageWidget } from './document/message.widget.js';
import { oauthHandoff, oauthPromptWidget } from './document/oauth-prompt.widget.js';
import { secretRequestWidget } from './document/secret-request.widget.js';
import type { CliWidget, CollectWidget, DocumentWidget } from './types.js';

/**
 * The widget registry — Studio's renderer registry counterpart. A widget can
 * `render` (transcript output) and/or `collect` (interactive prompt); what
 * the CLI can answer is exactly what has a collect implementation. To add a
 * widget, implement it under `document/` and/or `collect/` and register it
 * here.
 */
const WIDGETS = new Map<string, CliWidget>([
  ['llm-message', { render: llmMessageWidget }],
  ['message', { render: messageWidget }],
  ['plain', { render: messageWidget }],
  ['markdown', { render: markdownWidget }],
  ['error', { render: errorWidget }],
  ['link', { render: linkWidget }],
  ['form', { render: formWidget, collect: collectForm }],
  ['secret-input', { render: secretRequestWidget, collect: collectSecretInput }],
  // No collect — the browser round-trip fires the transition server-side;
  // the widget shows the sign-in link and names the wait at the pause point.
  ['oauth-prompt', { render: oauthPromptWidget, handoff: oauthHandoff }],
  // Collect-only prompts render nothing in the transcript — they belong to
  // the interactive HITL layer (Studio parity: the prompt card is the input).
  ['text-prompt', { collect: collectText }],
  ['confirm-prompt', { collect: collectConfirm }],
  ['choices', { collect: collectChoices }],
  // Workflow-level widgets (`@Workflow({ widget })`) — bound to the workflow
  // config, not to a document.
  ['prompt-input', { collect: collectPromptInput }],
  ['button', { collect: collectButton }],
]);

/**
 * Resolves a document's render widget: no declared widget → not rendered
 * (Studio parity), known widgets render their implementation (collect-only
 * prompts render nothing), unknown widgets → the JSON fallback.
 */
export function resolveDocumentWidget(widgetName: string | undefined): DocumentWidget | undefined {
  if (!widgetName) return undefined;
  const entry = WIDGETS.get(widgetName);
  if (entry) return entry.render;
  return jsonWidget;
}

/** The collect implementation for a widget — undefined means the CLI cannot answer it. */
export function resolveCollectWidget(widgetName: string | undefined): CollectWidget | undefined {
  return widgetName ? WIDGETS.get(widgetName)?.collect : undefined;
}

/** Whether the CLI can collect an answer for this widget. */
export function isCollectable(widgetName: string | undefined): boolean {
  return resolveCollectWidget(widgetName) !== undefined;
}

/** The widget's pause-point instruction for input the CLI cannot collect. */
export function resolveHandoff(widgetName: string | undefined, content: Record<string, unknown>): string | undefined {
  return widgetName ? WIDGETS.get(widgetName)?.handoff?.(content) : undefined;
}
