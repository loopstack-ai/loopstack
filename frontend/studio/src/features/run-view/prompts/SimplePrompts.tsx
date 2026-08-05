import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import type { RunPromptProps } from './types.ts';

function question(view: RunPromptProps['view']): string {
  const content = view.content as { question?: unknown } | undefined;
  return typeof content?.question === 'string' ? content.question : 'Input required';
}

/** `text-prompt`: free-text answer — submits `{ answer }` (the CLI collect shape). */
export function TextPrompt({ view, submit, isSubmitting }: RunPromptProps) {
  const [answer, setAnswer] = useState('');
  const send = () => {
    if (answer.trim()) submit({ answer: answer.trim() });
  };
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{question(view)}</p>
      <div className="flex gap-2">
        <Input
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && send()}
          placeholder="Your answer…"
          disabled={isSubmitting}
          autoFocus
        />
        <Button onClick={send} disabled={isSubmitting || !answer.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}

/** `confirm-prompt`: yes/no — submits `{ answer: 'yes' | 'no' }` (the CLI collect shape). */
export function ConfirmPrompt({ view, submit, isSubmitting }: RunPromptProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{question(view)}</p>
      <div className="flex gap-2">
        <Button onClick={() => submit({ answer: 'yes' })} disabled={isSubmitting}>
          Yes
        </Button>
        <Button variant="outline" onClick={() => submit({ answer: 'no' })} disabled={isSubmitting}>
          No
        </Button>
      </div>
    </div>
  );
}

/** `choices`: option picker, optionally with a custom answer — submits `{ answer }`. */
export function ChoicesPrompt({ view, submit, isSubmitting }: RunPromptProps) {
  const content = view.content as { question?: string; options?: string[]; allowCustomAnswer?: boolean } | undefined;
  const options = Array.isArray(content?.options) ? content.options : [];
  const [custom, setCustom] = useState('');
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{question(view)}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button key={option} variant="outline" onClick={() => submit({ answer: option })} disabled={isSubmitting}>
            {option}
          </Button>
        ))}
      </div>
      {content?.allowCustomAnswer === true && (
        <div className="flex gap-2">
          <Input
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && custom.trim() && submit({ answer: custom.trim() })}
            placeholder="Custom answer…"
            disabled={isSubmitting}
          />
          <Button onClick={() => submit({ answer: custom.trim() })} disabled={isSubmitting || !custom.trim()}>
            Send
          </Button>
        </div>
      )}
    </div>
  );
}

/** Workflow-level `prompt-input` (chat input): the payload is the raw message string. */
export function PromptInput({ view, submit, isSubmitting }: RunPromptProps) {
  const [message, setMessage] = useState('');
  const label = typeof view.options?.label === 'string' ? view.options.label : 'Message';
  const send = () => {
    if (message.trim()) {
      submit(message.trim());
      setMessage('');
    }
  };
  return (
    <div className="flex gap-2">
      <Input
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && send()}
        placeholder={`${label}…`}
        disabled={isSubmitting}
        autoFocus
      />
      <Button onClick={send} disabled={isSubmitting || !message.trim()}>
        Send
      </Button>
    </div>
  );
}

/** Workflow-level `button`: a single action firing its transition with an empty payload. */
export function ActionButton({ view, submit, isSubmitting }: RunPromptProps) {
  const label = typeof view.options?.label === 'string' ? view.options.label : (view.defaultTransition ?? 'Continue');
  return (
    <Button onClick={() => submit({})} disabled={isSubmitting}>
      {label}
    </Button>
  );
}

/** `button-full-w`: the `button` widget in its full-width variant. */
export function FullWidthActionButton({ view, submit, isSubmitting }: RunPromptProps) {
  const label = typeof view.options?.label === 'string' ? view.options.label : (view.defaultTransition ?? 'Continue');
  return (
    <Button className="w-full" onClick={() => submit({})} disabled={isSubmitting}>
      {label}
    </Button>
  );
}
