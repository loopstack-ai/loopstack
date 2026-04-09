import { Loader2 } from 'lucide-react';
import React, { useState } from 'react';
import type { WorkflowFullInterface } from '@loopstack/contracts/api';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import MarkdownContent from '@/components/dynamic-form/MarkdownContent.tsx';
import CompletionMessagePaper from '@/components/messages/CompletionMessagePaper.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { useDocumentTransition } from './useDocumentTransition.ts';

interface TextPromptContent {
  question: string;
  answer?: string;
}

interface TextPromptRendererProps {
  parentWorkflow: WorkflowFullInterface;
  workflow: WorkflowFullInterface;
  document: DocumentItemInterface;
  isActive: boolean;
}

const TextPromptRenderer: React.FC<TextPromptRendererProps> = ({ parentWorkflow, workflow, document, isActive }) => {
  const content = document.content as TextPromptContent;
  const { submit, canSubmit, isLoading } = useDocumentTransition(parentWorkflow, workflow, document.ui);

  const [text, setText] = useState('');
  const hasAnswer = !!content.answer;
  const disabled = !isActive || !canSubmit || hasAnswer;

  const handleSubmit = () => {
    const answer = text.trim();
    if (!answer) return;
    submit({ answer });
  };

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
            <Textarea
              placeholder="Type your answer..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={disabled}
              rows={3}
            />

            <div className="flex justify-end">
              <Button
                type="button"
                variant="default"
                disabled={disabled || isLoading || !text.trim()}
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

export default TextPromptRenderer;
