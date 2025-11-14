import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import type { UIFormButtonType } from '@loopstack/shared';
import { Send } from 'lucide-react';

interface ChatInputProps {
  uiOptions?: UIFormButtonType;
  disabled: boolean;
  onClick: (data: Record<string, any>) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ uiOptions, disabled, onClick }) => {
  const submitButtonText = uiOptions?.label || uiOptions?.transition || 'Submit';
  const submitButtonProps = uiOptions?.props || {};

  const [message, setMessage] = useState<string>('');

  const handleSubmit = () => {
    onClick({
      message,
      raw: message
    });
    setMessage('');
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative w-full mx-6 mb-6">
      <Input
        placeholder="Message"
        type="text"
        disabled={disabled}
        value={message}
        onChange={(evt) => setMessage(evt.target.value)}
        onKeyDown={handleKeyPress}
        className="pr-24 h-12"
      />
      <div className="absolute right-0 top-0 h-full">
        <Button
          variant="ghost"
          size="sm"
          {...submitButtonProps}
          disabled={disabled}
          onClick={handleSubmit}
          className="h-full rounded-l-none border-l"
        >
          {submitButtonText}
          <Send className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
