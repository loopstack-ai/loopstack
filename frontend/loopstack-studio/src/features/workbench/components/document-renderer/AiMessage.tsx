import { Fragment } from 'react';
import type { UIMessage } from 'ai';
import { CopyIcon, RefreshCcwIcon } from 'lucide-react';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message.tsx';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning.tsx';
import { Source, Sources, SourcesContent, SourcesTrigger } from '@/components/ai-elements/sources.tsx';
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from '@/components/ai-elements/tool.tsx';

const AiMessage = ({ document, isLastItem }: { document: DocumentItemInterface; isLastItem: boolean }) => {
  const message: UIMessage = document.content as UIMessage;

  return (
    <Fragment>
      {message.role === 'assistant' && message.parts?.filter((part: any) => part.type === 'source-url').length > 0 && (
        <Sources>
          <SourcesTrigger count={message.parts.filter((part: any) => part.type === 'source-url').length} />
          {message.parts
            .filter((part: any) => part.type === 'source-url')
            .map((part: any, i: number) => (
              <SourcesContent key={`${message.id}-${i}`}>
                <Source key={`${message.id}-${i}`} href={part.url} title={part.url} />
              </SourcesContent>
            ))}
        </Sources>
      )}
      {message.parts?.map((part: any, i: number) => {
        switch (true) {
          case part.type === 'text':
            return (
              <Message key={`${message.id}-${i}`} from={message.role}>
                <MessageContent>
                  <MessageResponse>{part.text}</MessageResponse>
                </MessageContent>
                {message.role === 'assistant' && isLastItem && (
                  <MessageActions>
                    <MessageAction
                      onClick={() => {}}
                      // onClick={() => regenerate()}
                      label="Retry"
                    >
                      <RefreshCcwIcon className="size-3" />
                    </MessageAction>
                    <MessageAction onClick={() => navigator.clipboard.writeText(part.text)} label="Copy">
                      <CopyIcon className="size-3" />
                    </MessageAction>
                  </MessageActions>
                )}
              </Message>
            );
          case part.type === 'reasoning':
            return (
              <Reasoning key={`${message.id}-${i}`} className="w-full" isStreaming={false}>
                <ReasoningTrigger />
                <ReasoningContent>{part.text}</ReasoningContent>
              </Reasoning>
            );
          case part.type.startsWith('tool-'):
            return (
              <Message key={`${message.id}-${i}`} from={message.role}>
                <Tool>
                  <ToolHeader state={part.state} title={part.type.replace(/^tool-/, '')} type={part.type} />
                  <ToolContent>
                    <ToolInput input={part.input} />
                    <ToolOutput output={part.output} errorText={part.errorText || ''} />
                  </ToolContent>
                </Tool>
              </Message>
            );
          default:
            return null;
        }
      })}
    </Fragment>
  );
};

export default AiMessage;
