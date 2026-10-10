import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { formatNumber } from './document-debug-utils.ts';

type MessageRole = 'system' | 'user' | 'assistant' | 'tool' | 'error' | 'document';

interface PromptData {
  cache?: { hit?: boolean; hash?: string };
  messages?: { role: MessageRole; content: string }[];
  response?: {
    data?: string;
    metadata?: {
      model?: string;
      prompt_id?: string;
      response_time?: number;
      prompt_token?: number;
      completion_token?: number;
    };
  };
}

interface PromptDetailsProps {
  promptData: PromptData;
}

const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid min-w-0 grid-cols-[7.5rem_1fr] gap-x-3 gap-y-0.5 text-sm">
    <span className="text-muted-foreground font-medium">{label}</span>
    <span className="min-w-0 wrap-break-word">{children}</span>
  </div>
);

const PromptDetails: React.FC<PromptDetailsProps> = ({ promptData }) => {
  if (!promptData) return null;

  const { messages, response, cache } = promptData;
  const metadata = response?.metadata;
  const totalTokens =
    metadata?.prompt_token != null && metadata?.completion_token != null
      ? metadata.prompt_token + metadata.completion_token
      : undefined;

  return (
    <div className="min-w-0 space-y-3">
      <Accordion type="multiple" defaultValue={['summary', 'messages']} className="min-w-0 space-y-1">
        <AccordionItem value="summary">
          <AccordionTrigger className="py-3 text-sm font-semibold">Request summary</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pb-1">
              <DetailRow label="Messages">{messages?.length ?? 0}</DetailRow>
              {cache && (
                <>
                  <DetailRow label="Cache hit">{cache.hit ? 'Yes' : 'No'}</DetailRow>
                  {cache.hash && <DetailRow label="Cache hash">{cache.hash}</DetailRow>}
                </>
              )}
              {metadata?.model && <DetailRow label="Model">{metadata.model}</DetailRow>}
              {metadata?.prompt_id && <DetailRow label="Prompt ID">{metadata.prompt_id}</DetailRow>}
              {metadata?.response_time != null && (
                <DetailRow label="Response time">{metadata.response_time} ms</DetailRow>
              )}
              {metadata?.prompt_token != null && (
                <DetailRow label="Prompt tokens">{formatNumber(metadata.prompt_token)}</DetailRow>
              )}
              {metadata?.completion_token != null && (
                <DetailRow label="Completion tokens">{formatNumber(metadata.completion_token)}</DetailRow>
              )}
              {totalTokens != null && <DetailRow label="Total tokens">{formatNumber(totalTokens)}</DetailRow>}
            </div>
          </AccordionContent>
        </AccordionItem>

        {messages && messages.length > 0 && (
          <AccordionItem value="messages">
            <AccordionTrigger className="py-3 text-sm font-semibold">Request messages</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {messages.map((message, index) => (
                  <div key={index} className="min-w-0 rounded-md border p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {message.role}
                      </Badge>
                      <span className="text-muted-foreground text-xs">{message.content.length} chars</span>
                    </div>
                    <pre className="max-h-48 min-w-0 max-w-full overflow-x-auto overflow-y-auto font-mono text-xs whitespace-pre-wrap">
                      {message.content}
                    </pre>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
};

export default PromptDetails;
