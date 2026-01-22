import type { UIMessage } from 'ai';
import { getToolOrDynamicToolName, isReasoningUIPart, isTextUIPart, isToolOrDynamicToolUIPart } from 'ai';
import { CopyIcon, RefreshCcwIcon } from 'lucide-react';
import { Fragment } from 'react';
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
  const message = document.content as UIMessage;

  const sourceParts = message.parts?.filter((part) => part.type === 'source-url') ?? [];

  return (
    <Fragment>
      {message.role === 'assistant' && sourceParts.length > 0 && (
        <Sources>
          <SourcesTrigger count={sourceParts.length} />
          {sourceParts.map((part, i) => (
            <SourcesContent key={`${message.id}-source-${i}`}>
              <Source href={part.url} title={part.url} />
            </SourcesContent>
          ))}
        </Sources>
      )}
      {message.parts?.map((part, i) => {
        if (isTextUIPart(part)) {
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
                  <MessageAction onClick={() => void navigator.clipboard.writeText(part.text)} label="Copy">
                    <CopyIcon className="size-3" />
                  </MessageAction>
                </MessageActions>
              )}
            </Message>
          );
        }

        if (isReasoningUIPart(part)) {
          return (
            <Reasoning key={`${message.id}-${i}`} className="w-full" isStreaming={false}>
              <ReasoningTrigger />
              <ReasoningContent>{part.text}</ReasoningContent>
            </Reasoning>
          );
        }

        if (isToolOrDynamicToolUIPart(part)) {
          const toolName = getToolOrDynamicToolName(part);
          return (
            <Message key={`${message.id}-${i}`} from={message.role}>
              <Tool>
                <ToolHeader state={part.state} title={toolName} type={part.type} />
                <ToolContent>
                  <ToolInput input={part.input} />
                  <ToolOutput output={part.output} errorText={part.errorText ?? ''} />
                </ToolContent>
              </Tool>
            </Message>
          );
        }

        return null;
      })}
    </Fragment>
  );
};

export default AiMessage;
