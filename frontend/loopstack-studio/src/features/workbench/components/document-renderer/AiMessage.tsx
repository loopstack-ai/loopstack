import { Fragment } from 'react';
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message.tsx';
import { CopyIcon } from 'lucide-react';
import type { UIMessage } from 'ai';
import type { DocumentItemDto } from '@loopstack/api-client';

const AiMessage = ({ document, isLastMessage }: { document: DocumentItemDto, isLastMessage: boolean }) => {

  const message: UIMessage = document.content as UIMessage;

  return (
    <Fragment key={document.id}>
      {message.parts?.map((part: any, i: number) => {
        switch (part.type) {
          case 'text':
            return (
              <Fragment key={`${document.id}-${i}`}>
                <Message from={message.role}>
                  <MessageContent>
                    <MessageResponse>{part.text}</MessageResponse>
                  </MessageContent>
                </Message>
                {message.role === 'assistant' && isLastMessage && (
                  <MessageActions>
                    {/*<MessageAction*/}
                    {/*  onClick={() => {}}*/}
                    {/*  label="Retry"*/}
                    {/*>*/}
                    {/*  <RefreshCcwIcon className="size-3" />*/}
                    {/*</MessageAction>*/}
                    <MessageAction
                      onClick={() =>
                        navigator.clipboard.writeText(part.text)
                      }
                      label="Copy"
                    >
                      <CopyIcon className="size-3" />
                    </MessageAction>
                  </MessageActions>
                )}
              </Fragment>
            );
          default:
            return null;
        }
      })}
    </Fragment>
  );
};

export default AiMessage;