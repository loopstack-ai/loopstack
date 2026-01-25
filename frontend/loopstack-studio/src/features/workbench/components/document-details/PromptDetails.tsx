import React from 'react';
import CompletionMessagePaper from '../../../../components/messages/CompletionMessagePaper.tsx';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../../components/ui/accordion.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card.tsx';

type MessageRole = 'system' | 'user' | 'assistant' | 'tool' | 'error' | 'document';

interface PromptData {
  cache: { hit?: boolean; hash?: string };
  messages: { role: MessageRole; content: string }[];
  response: {
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

const PromptDetails: React.FC<PromptDetailsProps> = ({ promptData }) => {
  if (!promptData) return null;

  const { messages, response, cache } = promptData;

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Cache</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="ml-4 space-y-1">
            <p className="text-sm">Hit: {cache?.hit ? 'Yes' : 'No'}</p>
            <p className="text-sm">Hash: {cache?.hash}</p>
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible defaultValue="messages">
        <AccordionItem value="messages">
          <AccordionTrigger className="text-lg font-semibold">Request Messages</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {messages?.map((message, index) => (
                <CompletionMessagePaper key={index} role={message.role}>
                  {message.content}
                </CompletionMessagePaper>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Accordion type="single" collapsible defaultValue="response">
        <AccordionItem value="response">
          <AccordionTrigger className="text-lg font-semibold">Response</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <pre className="font-mono text-xs wrap-break-word whitespace-pre-wrap">{response?.data}</pre>
                </CardContent>
              </Card>

              <Card className="bg-gray-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Metadata</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm">Model: {response?.metadata?.model}</p>
                    <p className="text-sm">Prompt ID: {response?.metadata?.prompt_id}</p>
                    <p className="text-sm">Response Time: {response?.metadata?.response_time} ms</p>
                    <p className="text-sm">Prompt Tokens: {response?.metadata?.prompt_token}</p>
                    <p className="text-sm">Completion Tokens: {response?.metadata?.completion_token}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default PromptDetails;
