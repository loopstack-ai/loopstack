import type { ComponentType } from 'react';
import { FormPrompt } from './FormPrompt.tsx';
import { ActionButton, ChoicesPrompt, ConfirmPrompt, PromptInput, TextPrompt } from './SimplePrompts.tsx';
import type { RunPromptProps } from './types.ts';

/**
 * The run view's interactive prompt set — its own registry, parallel to the CLI's collect
 * registry: the engine's eligibility predicate is `promptRegistry.has(widget)`, and adding
 * a widget later (`secret-input`, `oauth-prompt`) is one entry here. The CLI is untouched.
 */
export const promptRegistry = new Map<string, ComponentType<RunPromptProps>>([
  ['text-prompt', TextPrompt],
  ['confirm-prompt', ConfirmPrompt],
  ['choices', ChoicesPrompt],
  ['form', FormPrompt],
  ['prompt-input', PromptInput],
  ['button', ActionButton],
]);
