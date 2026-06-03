import { Pill } from 'lucide-react';
import { useState } from 'react';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';

interface AiPromptInputUi {
  label?: string;
}

interface AiPromptInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  ui?: AiPromptInputUi;
}

function AiPromptInput({ onSubmit, disabled, isLoading = false, ui }: AiPromptInputProps) {
  const [input, setInput] = useState('');

  const buttonLabel = ui?.label ?? 'Submit';

  return (
    <PromptInput
      onSubmit={(message, event) => {
        event.preventDefault();
        if (message.text) {
          onSubmit(message.text);
          setInput('');
        }
      }}
    >
      <PromptInputBody>
        <PromptInputTextarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={disabled || isLoading}
          rows={1}
          className="flex-1"
        />
      </PromptInputBody>
      <PromptInputFooter>
        <div className="mr-4 flex items-center">
          <Pill size="16" className="mr-2" />
          {buttonLabel}
        </div>
        <PromptInputSubmit disabled={disabled || isLoading} status={isLoading ? 'streaming' : 'ready'} />
      </PromptInputFooter>
    </PromptInput>
  );
}

export default AiPromptInput;
