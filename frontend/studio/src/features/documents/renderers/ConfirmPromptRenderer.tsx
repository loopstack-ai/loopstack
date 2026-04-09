import { Loader2 } from 'lucide-react';
import React from 'react';
import type { WorkflowFullInterface } from '@loopstack/contracts/api';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import MarkdownContent from '@/components/dynamic-form/MarkdownContent.tsx';
import CompletionMessagePaper from '@/components/messages/CompletionMessagePaper.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useDocumentTransition } from './useDocumentTransition.ts';

interface ConfirmPromptContent {
  question: string;
  answer?: string;
}

interface ConfirmPromptRendererProps {
  parentWorkflow: WorkflowFullInterface;
  workflow: WorkflowFullInterface;
  document: DocumentItemInterface;
  isActive: boolean;
}

const ConfirmPromptRenderer: React.FC<ConfirmPromptRendererProps> = ({
  parentWorkflow,
  workflow,
  document,
  isActive,
}) => {
  const content = document.content as ConfirmPromptContent;
  const { submit, canSubmit, isLoading } = useDocumentTransition(parentWorkflow, workflow, document.ui);

  const hasAnswer = !!content.answer;
  const disabled = !isActive || !canSubmit || hasAnswer;

  const handleAnswer = (answer: string) => {
    submit({ answer });
  };

  return (
    <CompletionMessagePaper role="document" fullWidth={true} timestamp={new Date(document.createdAt)}>
      <div className="flex flex-col gap-4 p-1">
        <MarkdownContent content={content.question} />

        {hasAnswer ? (
          <div className="text-muted-foreground text-sm">
            Answered: <span className="text-foreground font-medium">{content.answer === 'yes' ? 'Yes' : 'No'}</span>
          </div>
        ) : (
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={disabled || isLoading}
              onClick={() => handleAnswer('no')}
              className="w-32"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              No
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={disabled || isLoading}
              onClick={() => handleAnswer('yes')}
              className="w-32"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Yes
            </Button>
          </div>
        )}
      </div>
    </CompletionMessagePaper>
  );
};

export default ConfirmPromptRenderer;
