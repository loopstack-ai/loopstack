import { Loader2 } from 'lucide-react';
import React, { useState } from 'react';
import type { WorkflowFullInterface } from '@loopstack/contracts/api';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import MarkdownContent from '@/components/dynamic-form/MarkdownContent.tsx';
import CompletionMessagePaper from '@/components/messages/CompletionMessagePaper.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { useDocumentTransition } from './useDocumentTransition.ts';

interface ChoicesContent {
  question: string;
  options: string[];
  allowCustomAnswer?: boolean;
  answer?: string;
}

interface ChoicesRendererProps {
  parentWorkflow: WorkflowFullInterface;
  workflow: WorkflowFullInterface;
  document: DocumentItemInterface;
  isActive: boolean;
}

const ChoicesRenderer: React.FC<ChoicesRendererProps> = ({ parentWorkflow, workflow, document, isActive }) => {
  const content = document.content as ChoicesContent;
  const { submit, canSubmit, isLoading } = useDocumentTransition(parentWorkflow, workflow, document.ui);

  const [selected, setSelected] = useState<string>(content.answer ?? '');
  const [customText, setCustomText] = useState('');
  const isCustomSelected = selected === '__custom__';
  const hasAnswer = !!content.answer;

  const handleSubmit = () => {
    const answer = isCustomSelected ? customText.trim() : selected;
    if (!answer) return;
    submit({ answer });
  };

  const disabled = !isActive || !canSubmit || hasAnswer;

  return (
    <CompletionMessagePaper role="document" fullWidth={true} timestamp={new Date(document.createdAt)}>
      <div className="flex flex-col gap-4 p-1">
        <MarkdownContent content={content.question} />

        {hasAnswer ? (
          <div className="text-muted-foreground text-sm">
            Answered: <span className="text-foreground font-medium">{content.answer}</span>
          </div>
        ) : (
          <>
            <RadioGroup value={selected} onValueChange={setSelected} disabled={disabled}>
              {content.options.map((option, index) => (
                <div key={index} className="flex items-center gap-3">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="cursor-pointer text-sm font-normal">
                    {option}
                  </Label>
                </div>
              ))}
              {content.allowCustomAnswer && (
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="__custom__" id="option-custom" />
                  <Label htmlFor="option-custom" className="cursor-pointer text-sm font-normal">
                    Other
                  </Label>
                </div>
              )}
            </RadioGroup>

            {isCustomSelected && (
              <Textarea
                placeholder="Type your answer..."
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                disabled={disabled}
                className="min-h-10"
                rows={2}
              />
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                variant="default"
                disabled={disabled || isLoading || !selected || (isCustomSelected && !customText.trim())}
                onClick={handleSubmit}
                className="w-48"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit
              </Button>
            </div>
          </>
        )}
      </div>
    </CompletionMessagePaper>
  );
};

export default ChoicesRenderer;
