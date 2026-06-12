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
import { FadeInBlock } from '@/components/motion/FadeIn';
import { StreamingText } from '@/components/motion/StreamingText';

const CopyActions = ({ text }: { text: string }) => (
  <FadeInBlock>
    <MessageActions>
      <MessageAction onClick={() => void navigator.clipboard.writeText(text)} label="Copy">
        <CopyIcon className="size-3" />
      </MessageAction>
    </MessageActions>
  </FadeInBlock>
);

function hasStructuredBlocks(blocks: UIContentBlock[] | undefined): boolean {
  return !!blocks?.some((b) => b.type !== 'text');
}

function textFromBlocks(blocks: UIContentBlock[] | undefined): string {
  return (blocks ?? [])
    .filter((b): b is Extract<UIContentBlock, { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

const LlmMessage = ({ document }: { document: DocumentItemInterface; isLastItem: boolean }) => {
  const message = document.content as UIMessage;
  const messageId = (message as { id?: string }).id ?? document.id;
  const isStreaming = !!(document.meta as { streaming?: boolean } | undefined)?.streaming;

  // Plain text path — no structured blocks present.
  if (!hasStructuredBlocks(message.blocks)) {
    const text = message.text ?? textFromBlocks(message.blocks);
    return (
      <Message from={message.role}>
        <MessageContent>
          {isStreaming ? <StreamingText text={text} /> : <MessageResponse>{text}</MessageResponse>}
        </MessageContent>
        {message.role === 'assistant' && !isStreaming && <CopyActions text={text} />}
      </Message>
    );
  }

  // Structured path — walk blocks.
  const blocks = message.blocks ?? [];

  return (
    <Fragment>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'text':
            return (
              <Message key={`${messageId}-${i}`} from={message.role}>
                <MessageContent>
                  {isStreaming ? <StreamingText text={block.text} /> : <MessageResponse>{block.text}</MessageResponse>}
                </MessageContent>
                {message.role === 'assistant' && !isStreaming && <CopyActions text={block.text} />}
              </Message>
            );

          case 'thinking':
            return (
              <Reasoning key={`${messageId}-${i}`} className="w-full" isStreaming={isStreaming}>
                <ReasoningTrigger />
                <ReasoningContent>{block.text}</ReasoningContent>
              </Reasoning>
            );

          case 'tool_call':
            return (
              <FadeInBlock key={`${messageId}-${i}`}>
                <Message from="assistant">
                  <Tool>
                    <ToolHeader state="input-available" title={block.name} type="tool-call" />
                    <ToolContent>
                      <ToolInput input={block.args} />
                    </ToolContent>
                  </Tool>
                </Message>
              </FadeInBlock>
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
              <FadeInBlock key={`${messageId}-${i}`}>
                <Message from="assistant">
                  <Tool>
                    <ToolHeader state={resultState} title="Tool Result" type="tool-call" />
                    <ToolContent>
                      <ToolOutput output={parsedOutput} errorText={block.isError ? block.content : ''} />
                    </ToolContent>
                  </Tool>
                </Message>
              </FadeInBlock>
            );
          }

          case 'server_tool_use': {
            const serverResult = blocks.find(
              (b): b is Extract<UIContentBlock, { type: 'server_tool_result' }> =>
                b.type === 'server_tool_result' && b.toolUseId === block.id,
            );
            const serverToolState: ToolHeaderProps['state'] = serverResult ? 'output-available' : 'input-available';
            return (
              <FadeInBlock key={`${messageId}-${i}`}>
                <Message from="assistant">
                  <Tool>
                    <ToolHeader state={serverToolState} title={block.name} type="tool-call" />
                    <ToolContent>
                      <ToolInput input={block.input} />
                      {serverResult && <ToolOutput output={serverResult.content} errorText="" />}
                    </ToolContent>
                  </Tool>
                </Message>
              </FadeInBlock>
            );
          }

          case 'server_tool_result':
            return null;

          default:
            return null;
        }
      })}
    </Fragment>
  );
};

export default LlmMessage;
