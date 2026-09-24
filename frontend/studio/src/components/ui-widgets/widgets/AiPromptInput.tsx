import { Pill } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * A choice submitted alongside the text. Declared by the workflow, so the vocabulary stays the workflow's
 * own — Studio only renders what it is given.
 */
interface AiPromptInputField {
  name: string;
  label?: string;
  options: string[];
  default?: string;
}

interface AiPromptInputUi {
  label?: string;
  placeholder?: string;
  fields?: AiPromptInputField[];
}

interface AiPromptInputProps {
  onSubmit: (value: string | Record<string, unknown>) => void;
  disabled?: boolean;
  isLoading?: boolean;
  ui?: AiPromptInputUi;
}

/**
 * The chat-style input a workflow pins below its documents: type, submit, and the box clears itself for the
 * next one. Nothing is re-rendered to ask again, so a run that collects many entries accumulates only what
 * it produced.
 *
 * With `fields` declared it submits `{ text, ...values }` and renders each as a select beside the button —
 * for an entry that needs a choice or two alongside the text. Without them it submits the text alone, which
 * is what every existing caller receives.
 */
function AiPromptInput({ onSubmit, disabled, isLoading = false, ui }: AiPromptInputProps) {
  const [input, setInput] = useState('');
  const fields = useMemo(() => ui?.fields ?? [], [ui?.fields]);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.name, field.default ?? field.options[0] ?? ''])),
  );

  const buttonLabel = ui?.label ?? 'Submit';

  return (
    <PromptInput
      onSubmit={(message, event) => {
        event.preventDefault();
        if (!message.text) return;
        onSubmit(fields.length ? { text: message.text, ...values } : message.text);
        setInput('');
      }}
    >
      <PromptInputBody>
        <PromptInputTextarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={ui?.placeholder ?? 'Type your message...'}
          disabled={disabled || isLoading}
          rows={1}
          className="flex-1"
        />
      </PromptInputBody>
      <PromptInputFooter>
        <div className="mr-4 flex items-center gap-2">
          <Pill size="16" className="mr-2" />
          {buttonLabel}
          {fields.map((field) => (
            <Select
              key={field.name}
              value={values[field.name]}
              onValueChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))}
              disabled={disabled || isLoading}
            >
              <SelectTrigger size="sm" className="h-7 min-w-28" aria-label={field.label ?? field.name}>
                <SelectValue placeholder={field.label ?? field.name} />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
        <PromptInputSubmit disabled={disabled || isLoading} status={isLoading ? 'streaming' : 'ready'} />
      </PromptInputFooter>
    </PromptInput>
  );
}

export default AiPromptInput;
