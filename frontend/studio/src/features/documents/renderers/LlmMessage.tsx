import { CopyIcon } from 'lucide-react';
import { Fragment } from 'react';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import type { UIContentBlock, UIMessage } from '@loopstack/contracts/types';
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message.tsx';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning.tsx';
import type { ToolHeaderProps } from '@/components/loopstack-elements/tool.tsx';
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from '@/components/loopstack-elements/tool.tsx';

const LlmMessage = ({ document }: { document: DocumentItemInterface; isLastItem: boolean }) => {
  const message = document.content as UIMessage;
  const messageId = (message as any).id ?? document.id;

  // String content — simple text message
  if (typeof message.content === 'string') {
    return (
      <Message from={message.role}>
        <MessageContent>
          <MessageResponse>{message.content}</MessageResponse>
        </MessageContent>
        {message.role === 'assistant' && (
          <MessageActions>
            <MessageAction onClick={() => void navigator.clipboard.writeText(message.content as string)} label="Copy">
              <CopyIcon className="size-3" />
            </MessageAction>
          </MessageActions>
        )}
      </Message>
    );
  }

  // Array content — iterate over UIContentBlocks
  const blocks: UIContentBlock[] = message.content;

  return (
    <Fragment>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'text':
            return (
              <Message key={`${messageId}-${i}`} from={message.role}>
                <MessageContent>
                  <MessageResponse>{block.text}</MessageResponse>
                </MessageContent>
                {message.role === 'assistant' && (
                  <MessageActions>
                    <MessageAction onClick={() => void navigator.clipboard.writeText(block.text)} label="Copy">
                      <CopyIcon className="size-3" />
                    </MessageAction>
                  </MessageActions>
                )}
              </Message>
            );

          case 'thinking':
            return (
              <Reasoning key={`${messageId}-${i}`} className="w-full" isStreaming={false}>
                <ReasoningTrigger />
                <ReasoningContent>{block.text}</ReasoningContent>
              </Reasoning>
            );

          case 'tool_call':
            return (
              <Message key={`${messageId}-${i}`} from="assistant">
                <Tool>
                  <ToolHeader state="input-available" title={block.name} type="tool-call" />
                  <ToolContent>
                    <ToolInput input={block.args} />
                  </ToolContent>
                </Tool>
              </Message>
            );

          case 'tool_result': {
            let parsedOutput: unknown;
            try {
              parsedOutput = JSON.parse(block.content);
            } catch {
              parsedOutput = block.content;
            }
            const resultState: ToolHeaderProps['state'] = block.isError ? 'output-error' : 'output-available';
            return (
              <Message key={`${messageId}-${i}`} from="assistant">
                <Tool>
                  <ToolHeader state={resultState} title="Tool Result" type="tool-call" />
                  <ToolContent>
                    <ToolOutput output={parsedOutput} errorText={block.isError ? block.content : ''} />
                  </ToolContent>
                </Tool>
              </Message>
            );
          }

          case 'server_tool_use': {
            // Find matching server_tool_result in the blocks
            const serverResult = blocks.find(
              (b): b is Extract<UIContentBlock, { type: 'server_tool_result' }> =>
                b.type === 'server_tool_result' && b.toolUseId === block.id,
            );
            const serverToolState: ToolHeaderProps['state'] = serverResult ? 'output-available' : 'input-available';
            return (
              <Message key={`${messageId}-${i}`} from="assistant">
                <Tool>
                  <ToolHeader state={serverToolState} title={block.name} type="tool-call" />
                  <ToolContent>
                    <ToolInput input={block.input} />
                    {serverResult && <ToolOutput output={serverResult.content} errorText="" />}
                  </ToolContent>
                </Tool>
              </Message>
            );
          }

          case 'server_tool_result':
            // Rendered inline with server_tool_use above
            return null;

          default:
            return null;
        }
      })}
    </Fragment>
  );
};

export default LlmMessage;
